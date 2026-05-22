import { validateCommitMessage } from './commit-message.js';

const COMMIT_AND_PUSH = 'commit-and-push';
const COMMIT_ONLY = 'commit-only';
const CANCEL = 'cancel';

export async function runCommitWorkflow({ git, ui }) {
    try {
        ui.showGuide();
        ui.showFormatReference();

        if (!git.isRepository()) {
            ui.error('The current directory is not a git repository');
            return {
                ok: false,
                reason: 'not-repository'
            };
        }

        if (!git.hasChanges()) {
            ui.warn('There are no modifications to the current storage card');
            return {
                ok: false,
                reason: 'no-changes'
            };
        }

        const changedFiles = git.listChangedFiles();
        const message = await ui.askCommitMessage();
        const validation = validateCommitMessage(message);

        if (!validation.valid) {
            ui.invalidCommitMessage(message);
            return {
                ok: false,
                reason: validation.reason
            };
        }

        ui.showCommitPreview({
            message,
            files: changedFiles
        });

        const action = await ui.askCommitAction();

        if (action === CANCEL) {
            ui.warn('Commit cancelled.');
            return {
                ok: false,
                reason: 'cancelled'
            };
        }

        try {
            git.addAll();
            git.commit(message);

            if (action === COMMIT_ONLY) {
                ui.success('Commit Success.');
                return {
                    ok: true,
                    pushed: false
                };
            }

            const branch = git.getCurrentBranch();
            git.push(branch);

            ui.success('Submit Success.');
            return {
                ok: true,
                pushed: true,
                branch
            };
        } catch (error) {
            ui.error(`Commit error: ${error.message || error}`);
            return {
                ok: false,
                reason: 'git-error',
                error
            };
        }
    } finally {
        ui.close?.();
    }
}
