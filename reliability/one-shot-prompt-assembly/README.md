# One-Shot Prompt Assembly

This pattern prevents the failure mode where agents attempt to execute tasks without sufficient context, resulting in repeated retries, token waste, and degraded output quality. It is designed for engineers building autonomous coding or content generation systems who want to maximize first-attempt success rates by ensuring all necessary inputs are assembled before execution begins.

## The problem

An agent system receives a request to refactor a module. The initial prompt includes only the function signature and the desired behavior description. The agent begins writing code but lacks access to the existing test suite, the project's style guide, and recent changes in related modules. It produces plausible-looking code that fails validation on the first check. The system enters a retry loop: it fetches tests, reformats the prompt, resubmits, and tries again. Each iteration consumes tokens and time. In some cases, the agent becomes confused by conflicting context from previous failed attempts and produces increasingly incorrect output. The failure is not in the reasoning capability but in the incomplete input assembly phase.

## The pattern

The one-shot prompt assembly pattern ensures that before an agent begins execution, a complete context package is constructed and validated. This involves three steps: identifying required context types, fetching each piece of context in parallel, and assembling them into a single structured payload with clear section boundaries.

Step one requires defining what context categories are necessary for the task type. For code generation, these typically include source files, tests, configuration, and recent changes. Step two fetches all required context simultaneously rather than sequentially. This reduces latency and ensures no piece is missed due to early termination. Step three assembles the fetched items into a structured prompt with explicit section headers and metadata about each item's relevance. The final assembly includes a validation check that confirms all required sections are present before submission.

## Reference implementation sketch

```typescript
interface ContextPackage {
  sourceCode: string;
  tests: string[];
  config: Record<string, unknown>;
  recentChanges: string;
}

async function assembleOneShotPrompt(
  task: AgentTask,
  contextFetcher: IContextFetcher
): Promise<StructuredPrompt> {
  // Step 1: Identify required context types based on task type
  const requiredContextTypes = getRequiredContextForTask(task.type);
  
  // Step 2: Fetch all context in parallel
  const fetchedContext = await Promise.all(
    requiredContextTypes.map(type => 
      contextFetcher.fetch(type, task.dependencies)
    )
  );
  
  // Step 3: Assemble into structured prompt
  const assembly = {
    sections: [
      { header: 'TASK DESCRIPTION', content: task.description },
      { header: 'SOURCE CODE', content: fetchedContext[0] },
      { header: 'TEST SUITE', content: fetchedContext[1].join('\n\n') },
      { header: 'CONFIGURATION', content: JSON.stringify(fetchedContext[2], null, 2) },
      { header: 'RECENT CHANGES', content: fetchedContext[3] }
    ],
    validationStatus: validateAssembly(fetchedContext),
    timestamp: Date.now()
  };
  
  return assembly;
}

function validateAssembly(context: unknown[]): boolean {
  // Ensure no required section is empty or null
  return context.every(item => item !== null && item !== undefined);
}
```

## What this does not catch

This pattern assumes that the identified context categories are sufficient. If a critical piece of information falls outside predefined categories, it will be missed. It does not validate semantic relevance, only presence. A test file might be included but irrelevant to the current task. The pattern also does not handle dynamic context that changes during execution, such as runtime state or user feedback received mid-task. Additionally, if the context fetcher itself fails for one category, the entire assembly may fail unless fallback mechanisms are in place.

## Apply it in your system

1. Define context categories specific to your task types. For code tasks, list source files, tests, configs, and logs as separate categories.
2. Implement a parallel fetch mechanism that retrieves all required context simultaneously before any reasoning begins.
3. Add explicit section headers to each context piece when assembling the prompt. This helps the model parse and reference information correctly.
4. Include a validation step that checks all required sections are present and non-empty before submission.
5. Log assembly metadata including which context pieces were included and their sizes. Use this data to identify patterns in failed one-shot attempts and refine your context selection logic over time.
