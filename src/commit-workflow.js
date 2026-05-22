import { validateCommitMessage } from './commit-message.js';

export async function runCommitWorkflow({ git, ui }) {
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

    const message = await ui.askCommitMessage();
    const validation = validateCommitMessage(message);

    if (!validation.valid) {
        ui.invalidCommitMessage(message);
        return {
            ok: false,
            reason: validation.reason
        };
    }

    try {
        git.addAll();
        git.commit(message);

        const branch = git.getCurrentBranch();
        git.push(branch);

        ui.success('Submit Success.');
        return {
            ok: true,
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
}
