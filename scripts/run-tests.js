import assert from 'assert/strict';
import { EventEmitter } from 'events';
import { Writable } from 'stream';
import { validateCommitMessage, formatCommitGuide } from '../src/commit-message.js';
import { runCommitWorkflow } from '../src/commit-workflow.js';
import { createGitAdapter } from '../src/git.js';
import { canUseInteractiveSelect, selectActionWithKeyboard } from '../src/cli.js';

const tests = [];

function test(name, fn) {
    tests.push({ name, fn });
}

function createUi({
    message = 'feat: add tests',
    action = 'commit-and-push'
} = {}) {
    const calls = [];

    return {
        calls,
        showGuide() {
            calls.push(['showGuide']);
        },
        showFormatReference() {
            calls.push(['showFormatReference']);
        },
        askCommitMessage() {
            calls.push(['askCommitMessage']);
            return Promise.resolve(message);
        },
        showCommitPreview(value) {
            calls.push(['showCommitPreview', value]);
        },
        askCommitAction() {
            calls.push(['askCommitAction']);
            return Promise.resolve(action);
        },
        invalidCommitMessage(value) {
            calls.push(['invalidCommitMessage', value]);
        },
        warn(value) {
            calls.push(['warn', value]);
        },
        error(value) {
            calls.push(['error', value]);
        },
        success(value) {
            calls.push(['success', value]);
        }
    };
}

function createFakeGit({
    isRepository = true,
    hasChanges = true,
    changedFiles = ['M  index.js'],
    branch = 'main',
    failOn = ''
} = {}) {
    const calls = [];

    function maybeFail(step) {
        calls.push([step]);

        if (failOn === step) {
            throw new Error(`${step} failed`);
        }
    }

    return {
        calls,
        isRepository() {
            calls.push(['isRepository']);
            return isRepository;
        },
        hasChanges() {
            calls.push(['hasChanges']);
            return hasChanges;
        },
        listChangedFiles() {
            calls.push(['listChangedFiles']);
            return changedFiles;
        },
        addAll() {
            maybeFail('addAll');
        },
        commit(message) {
            calls.push(['commit', message]);

            if (failOn === 'commit') {
                throw new Error('commit failed');
            }
        },
        getCurrentBranch() {
            calls.push(['getCurrentBranch']);
            return branch;
        },
        push(value) {
            calls.push(['push', value]);

            if (failOn === 'push') {
                throw new Error('push failed');
            }
        }
    };
}

test('commit message accepts supported conventional commit formats', () => {
    assert.equal(validateCommitMessage('feat: add login').valid, true);
    assert.equal(validateCommitMessage('fix(parser): handle quotes').valid, true);
    assert.equal(validateCommitMessage('revert: feat: add login').valid, true);
});

test('commit message rejects unsupported formats', () => {
    assert.equal(validateCommitMessage('update readme').valid, false);
    assert.equal(validateCommitMessage('feat add login').valid, false);
    assert.equal(validateCommitMessage('feat: ').valid, false);
});

test('commit guide is generated from the shared commit type list', () => {
    const guide = formatCommitGuide();

    assert.match(guide, /^feat, fix, docs/);
    assert.match(guide, /refactor, test$/);
});

test('workflow stops before prompting when current directory is not a git repository', async () => {
    const git = createFakeGit({ isRepository: false });
    const ui = createUi();

    const result = await runCommitWorkflow({ git, ui });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'not-repository');
    assert.deepEqual(git.calls, [['isRepository']]);
    assert.equal(ui.calls.some(([name]) => name === 'askCommitMessage'), false);
});

test('workflow stops before prompting when there are no changes', async () => {
    const git = createFakeGit({ hasChanges: false });
    const ui = createUi();

    const result = await runCommitWorkflow({ git, ui });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'no-changes');
    assert.deepEqual(git.calls, [['isRepository'], ['hasChanges']]);
    assert.equal(ui.calls.some(([name]) => name === 'askCommitMessage'), false);
});

test('workflow stops before git writes when commit message is invalid', async () => {
    const git = createFakeGit();
    const ui = createUi({ message: 'bad message' });

    const result = await runCommitWorkflow({ git, ui });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'invalid-format');
    assert.deepEqual(git.calls, [['isRepository'], ['hasChanges'], ['listChangedFiles']]);
    assert.equal(ui.calls.some(([name]) => name === 'invalidCommitMessage'), true);
    assert.equal(ui.calls.some(([name]) => name === 'askCommitAction'), false);
});

test('workflow previews changes before asking whether to continue', async () => {
    const git = createFakeGit({
        changedFiles: ['M  index.js', 'A  src/git.js']
    });
    const ui = createUi();

    const result = await runCommitWorkflow({ git, ui });
    const preview = ui.calls.find(([name]) => name === 'showCommitPreview');

    assert.equal(result.ok, true);
    assert.deepEqual(preview, [
        'showCommitPreview',
        {
            message: 'feat: add tests',
            files: ['M  index.js', 'A  src/git.js']
        }
    ]);
    assert.ok(
        ui.calls.findIndex(([name]) => name === 'showCommitPreview') <
            ui.calls.findIndex(([name]) => name === 'askCommitAction')
    );
});

test('workflow adds, commits, reads branch, and pushes in order', async () => {
    const git = createFakeGit({ branch: 'feature/test' });
    const ui = createUi({ message: 'feat: add tests' });

    const result = await runCommitWorkflow({ git, ui });

    assert.equal(result.ok, true);
    assert.equal(result.pushed, true);
    assert.equal(result.branch, 'feature/test');
    assert.deepEqual(git.calls, [
        ['isRepository'],
        ['hasChanges'],
        ['listChangedFiles'],
        ['addAll'],
        ['commit', 'feat: add tests'],
        ['getCurrentBranch'],
        ['push', 'feature/test']
    ]);
    assert.equal(ui.calls.some(([name]) => name === 'success'), true);
});

test('workflow can commit without pushing', async () => {
    const git = createFakeGit();
    const ui = createUi({
        message: 'feat: add tests',
        action: 'commit-only'
    });

    const result = await runCommitWorkflow({ git, ui });

    assert.equal(result.ok, true);
    assert.equal(result.pushed, false);
    assert.deepEqual(git.calls, [
        ['isRepository'],
        ['hasChanges'],
        ['listChangedFiles'],
        ['addAll'],
        ['commit', 'feat: add tests']
    ]);
});

test('workflow can cancel before writing git changes', async () => {
    const git = createFakeGit();
    const ui = createUi({
        message: 'feat: add tests',
        action: 'cancel'
    });

    const result = await runCommitWorkflow({ git, ui });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'cancelled');
    assert.deepEqual(git.calls, [['isRepository'], ['hasChanges'], ['listChangedFiles']]);
});

test('workflow reports git failures without continuing to push', async () => {
    const git = createFakeGit({ failOn: 'commit' });
    const ui = createUi({ message: 'feat: add tests' });

    const result = await runCommitWorkflow({ git, ui });

    assert.equal(result.ok, false);
    assert.equal(result.reason, 'git-error');
    assert.equal(git.calls.some(([name]) => name === 'push'), false);
    assert.equal(ui.calls.some(([name]) => name === 'error'), true);
});

test('git adapter passes commit messages as arguments instead of shell text', () => {
    const calls = [];
    const git = createGitAdapter({
        runGit(args, options) {
            calls.push({ args, options });
            return '';
        }
    });

    git.commit('fix: keep "quoted" text safe');

    assert.deepEqual(calls, [
        {
            args: ['commit', '-m', 'fix: keep "quoted" text safe'],
            options: { stdio: 'inherit' }
        }
    ]);
});

test('interactive action selection uses arrow keys and enter', async () => {
    const input = new EventEmitter();
    const outputChunks = [];
    const output = new Writable({
        write(chunk, _encoding, callback) {
            outputChunks.push(chunk.toString());
            callback();
        }
    });

    input.isTTY = true;
    output.isTTY = true;
    input.isRaw = false;
    input.setRawMode = value => {
        input.isRaw = value;
    };
    input.resume = () => {};

    const selection = selectActionWithKeyboard({ input, output });

    input.emit('keypress', '', { name: 'down' });
    input.emit('keypress', '', { name: 'return' });

    assert.equal(await selection, 'commit-only');
    assert.equal(input.isRaw, false);
    assert.equal(outputChunks.join('').includes('Use up/down and Enter'), true);
});

test('interactive action selection only runs in a TTY', () => {
    assert.equal(canUseInteractiveSelect({ isTTY: true, setRawMode() {} }, { isTTY: true }), true);
    assert.equal(canUseInteractiveSelect({ isTTY: false, setRawMode() {} }, { isTTY: true }), false);
});

let failures = 0;

for (const { name, fn } of tests) {
    try {
        await fn();
        console.log(`PASS ${name}`);
    } catch (error) {
        failures += 1;
        console.error(`FAIL ${name}`);
        console.error(error);
    }
}

if (failures > 0) {
    process.exitCode = 1;
}
