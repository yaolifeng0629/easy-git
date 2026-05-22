import readlineCb from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';
import { formatCommitGuide, formatInvalidCommitMessage } from './commit-message.js';

function writeLine(stream, message = '') {
    stream.write(`${message}\n`);
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
            const guideData = boxen(`\n${formatCommitGuide()}\n`, {
                width: 60,
                height: 20,
                padding: 10,
                title: 'easy-commit-util 🚀 ',
                titleAlignment: 'center',
                borderColor: 'cyanBright',
                margin: {
                    top: 1,
                    right: 0,
                    bottom: 1,
                    left: 0
                }
            });

            writeLine(output, chalk.yellow(guideData));
        },

        showFormatReference() {
            writeLine(
                output,
                chalk.gray('Canonical format Reference: https://www.conventionalcommits.org/en/v1.0.0/#specification')
            );
            writeLine(output, chalk.gray(''));
        },

        askCommitMessage() {
            return lineReader.ask('Please enter a submission message: ');
        },

        showCommitPreview({ message, files }) {
            writeLine(output);
            writeLine(output, chalk.cyan('Commit preview:'));
            writeLine(output, `Message: ${message}`);
            writeLine(output, 'Files:');

            for (const file of files) {
                writeLine(output, `  ${file}`);
            }
        },

        async askCommitAction() {
            writeLine(output);
            writeLine(output, 'Choose next step:');
            writeLine(output, '  1. Commit and push');
            writeLine(output, '  2. Commit only');
            writeLine(output, '  3. Cancel');

            while (true) {
                const answer = await lineReader.ask('Select 1, 2, or 3: ');

                if (answer === null) {
                    return 'cancel';
                }

                if (answer === '1') {
                    return 'commit-and-push';
                }

                if (answer === '2') {
                    return 'commit-only';
                }

                if (answer === '3') {
                    return 'cancel';
                }

                writeLine(output, chalk.yellow('Please enter 1, 2, or 3.'));
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
