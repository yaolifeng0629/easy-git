import { createCli } from './cli.js';
import { runCommitWorkflow } from './commit-workflow.js';
import { createGitAdapter } from './git.js';
import { parseCliArgs } from './args.js';

const FAILURE_EXIT_REASONS = new Set(['invalid-format', 'git-error']);

export async function runFromCli({
    argv = process.argv.slice(2),
    git = createGitAdapter(),
    ui = createCli()
} = {}) {
    try {
        const parsedArgs = parseCliArgs(argv);

        if (!parsedArgs.ok) {
            ui.error(parsedArgs.error);
            process.exitCode = 1;

            return parsedArgs;
        }

        const result = await runCommitWorkflow({
            git,
            ui,
            options: parsedArgs.options
        });

        if (!result.ok && FAILURE_EXIT_REASONS.has(result.reason)) {
            process.exitCode = 1;
        }

        return result;
    } catch (error) {
        ui.error(error.message || String(error));
        process.exitCode = 1;

        return {
            ok: false,
            reason: 'unexpected-error',
            error
        };
    }
}
