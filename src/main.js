import { createCli } from './cli.js';
import { runCommitWorkflow } from './commit-workflow.js';
import { createGitAdapter } from './git.js';

const FAILURE_EXIT_REASONS = new Set(['invalid-format', 'git-error']);

export async function runFromCli({
    git = createGitAdapter(),
    ui = createCli()
} = {}) {
    try {
        const result = await runCommitWorkflow({ git, ui });

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
