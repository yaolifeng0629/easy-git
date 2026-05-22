import readlineCb from 'readline';
import chalk from 'chalk';
import { formatCommitGuide, formatInvalidCommitMessage } from './commit-message.js';

function writeLine(stream, message = '') {
    stream.write(`${message}\n`);
}

function formatFileStatus(file) {
    const status = file.slice(0, 2).trim();
    const name = file.slice(2).trim();

    return {
        status: status || '?',
        name: name || file
    };
}

const ACTION_CHOICES = [
    {
        value: 'commit-and-push',
        label: 'commit + push'
    },
    {
        value: 'commit-only',
        label: 'commit only'
    },
    {
        value: 'cancel',
        label: 'cancel'
    }
];

export function canUseInteractiveSelect(input, output) {
    return Boolean(input.isTTY && output.isTTY && typeof input.setRawMode === 'function');
}

function renderActionChoices(output, selectedIndex) {
    const lines = [
        chalk.bold('Action'),
        ...ACTION_CHOICES.map((choice, index) => {
            const marker = index === selectedIndex ? '>' : ' ';
            const label = index === selectedIndex ? chalk.cyan(choice.label) : choice.label;

            return `  ${marker} ${label}`;
        }),
        '',
        chalk.gray('Use up/down and Enter')
    ];

    writeLine(output, lines.join('\n'));

    return lines.length;
}

function moveCursorToMenuStart(output, lineCount) {
    output.write(`\x1b[${lineCount}A`);
    output.write('\x1b[0J');
}

export function selectActionWithKeyboard({ input, output }) {
    readlineCb.emitKeypressEvents(input);

    const previousRawMode = input.isRaw;
    const wasPaused = input.isPaused?.() ?? false;
    let selectedIndex = 0;
    let renderedLines = renderActionChoices(output, selectedIndex);

    input.setRawMode(true);
    input.resume();

    return new Promise(resolve => {
        function cleanup() {
            input.off('keypress', onKeypress);
            input.setRawMode(Boolean(previousRawMode));

            if (wasPaused && typeof input.pause === 'function') {
                input.pause();
            }

            writeLine(output);
        }

        function updateSelection(nextIndex) {
            selectedIndex = (nextIndex + ACTION_CHOICES.length) % ACTION_CHOICES.length;
            moveCursorToMenuStart(output, renderedLines);
            renderedLines = renderActionChoices(output, selectedIndex);
        }

        function onKeypress(_text, key = {}) {
            if (key.name === 'up') {
                updateSelection(selectedIndex - 1);
                return;
            }

            if (key.name === 'down') {
                updateSelection(selectedIndex + 1);
                return;
            }

            if (key.name === 'return' || key.name === 'enter') {
                const action = ACTION_CHOICES[selectedIndex].value;
                cleanup();
                resolve(action);
                return;
            }

            if (key.name === 'escape' || (key.ctrl && key.name === 'c')) {
                cleanup();
                resolve('cancel');
            }
        }

        input.on('keypress', onKeypress);
    });
}

function createLineReader({ input, output }) {
    let readline;
    let closed = false;
    const pending = [];
    const buffered = [];

    function ensureReadline() {
        if (readline) {
            return;
        }

        readline = readlineCb.createInterface({
            input,
            output
        });

        readline.on('line', line => {
            const resolve = pending.shift();

            if (resolve) {
                resolve(line);
            } else {
                buffered.push(line);
            }
        });

        readline.on('close', () => {
            closed = true;

            while (pending.length > 0) {
                pending.shift()(null);
            }
        });
    }

    return {
        ask(question) {
            ensureReadline();
            output.write(question);

            if (buffered.length > 0) {
                return Promise.resolve(buffered.shift().trim());
            }

            if (closed) {
                return Promise.resolve(null);
            }

            return new Promise(resolve => {
                pending.push(line => resolve(line === null ? null : line.trim()));
            });
        },

        close() {
            if (readline && !closed) {
                readline.close();
            }

            readline = undefined;
            closed = false;
            pending.length = 0;
            buffered.length = 0;
        }
    };
}

export function createCli({
    input = process.stdin,
    output = process.stdout,
    errorOutput = process.stderr
} = {}) {
    const lineReader = createLineReader({ input, output });

    return {
        showGuide() {
            writeLine(output, chalk.bold('commitgo'));
            writeLine(output);
            writeLine(output, `Types: ${chalk.gray(formatCommitGuide())}`);
        },

        showFormatReference() {
            writeLine(
                output,
                chalk.gray('Format: type(scope): message  |  https://www.conventionalcommits.org/en/v1.0.0/#specification')
            );
            writeLine(output, chalk.gray(''));
        },

        askCommitMessage() {
            writeLine(output, chalk.bold('Message:'));
            return lineReader.ask(chalk.gray('  > '));
        },

        showCommitPreview({ message, files }) {
            writeLine(output);
            writeLine(output, chalk.bold('Message'));
            writeLine(output, `  ${chalk.gray(message)}`);
            writeLine(output);
            writeLine(output, chalk.bold('Files'));

            for (const file of files) {
                const { status, name } = formatFileStatus(file);
                writeLine(output, `  ${chalk.yellow(status.padEnd(2))} ${name}`);
            }
        },

        async askCommitAction() {
            writeLine(output);

            if (canUseInteractiveSelect(input, output)) {
                lineReader.close();
                return selectActionWithKeyboard({ input, output });
            }

            writeLine(output, chalk.bold('Action'));
            ACTION_CHOICES.forEach((choice, index) => {
                writeLine(output, `  ${chalk.cyan(String(index + 1))} ${choice.label}`);
            });
            writeLine(output, chalk.gray('> '));

            while (true) {
                const answer = await lineReader.ask('');

                if (answer === null) {
                    return 'cancel';
                }

                const selectedChoice = ACTION_CHOICES[Number(answer) - 1];

                if (selectedChoice) {
                    return selectedChoice.value;
                }

                writeLine(output, chalk.yellow('Please choose 1, 2, or 3.'));
            }
        },

        invalidCommitMessage(message) {
            writeLine(errorOutput);
            writeLine(errorOutput, formatInvalidCommitMessage(message, chalk));
        },

        warn(message) {
            writeLine(output, chalk.yellow(message));
        },

        error(message) {
            writeLine(errorOutput, chalk.red(message));
        },

        success(message) {
            writeLine(output, chalk.green(message));
        },

        close() {
            lineReader.close();
        }
    };
}
