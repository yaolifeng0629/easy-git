import readlineCb from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';
import Table from 'cli-table3';
import { formatCommitGuide, formatInvalidCommitMessage } from './commit-message.js';

function writeLine(stream, message = '') {
    stream.write(`${message}\n`);
}

function createBox(content, options = {}) {
    return boxen(content, {
        padding: 1,
        borderColor: 'cyanBright',
        borderStyle: 'round',
        ...options
    });
}

function formatFileStatus(file) {
    const status = file.slice(0, 2).trim();
    const name = file.slice(2).trim();

    return {
        status: status || '?',
        name: name || file
    };
}

function formatActionLabel(action) {
    const labels = {
        '1': ['Commit and push', '提交后立即推送到当前分支'],
        '2': ['Commit only', '只生成本地提交，不推送'],
        '3': ['Cancel', '取消本次操作，不改动仓库']
    };

    return labels[action];
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
            const guideTable = new Table({
                head: [chalk.cyan('#'), chalk.cyan('Type'), chalk.cyan('Use for')],
                colWidths: [5, 14, 34],
                wordWrap: true,
                style: {
                    head: [],
                    border: ['gray']
                }
            });

            for (const item of formatCommitGuide()) {
                guideTable.push([
                    chalk.gray(String(item.index)),
                    chalk.green(item.type),
                    item.description
                ]);
            }

            writeLine(
                output,
                createBox(`${chalk.bold('easy-commit-util')}\n${chalk.gray('Commit with preview and safer push control.')}`, {
                    title: 'READY',
                    titleAlignment: 'center'
                })
            );
            writeLine(output);
            writeLine(output, chalk.bold('Commit types'));
            writeLine(output, guideTable.toString());
        },

        showFormatReference() {
            writeLine(
                output,
                chalk.gray('Format: type(scope): message  |  https://www.conventionalcommits.org/en/v1.0.0/#specification')
            );
            writeLine(output, chalk.gray(''));
        },

        askCommitMessage() {
            return lineReader.ask(chalk.bold('Commit message') + chalk.gray(' > '));
        },

        showCommitPreview({ message, files }) {
            const filesTable = new Table({
                head: [chalk.cyan('Status'), chalk.cyan('File')],
                colWidths: [10, 54],
                wordWrap: true,
                style: {
                    head: [],
                    border: ['gray']
                }
            });

            for (const file of files) {
                const { status, name } = formatFileStatus(file);
                filesTable.push([chalk.yellow(status), name]);
            }

            writeLine(output);
            writeLine(
                output,
                createBox(
                    `${chalk.bold('Message')}\n${message}\n\n${chalk.bold('Files')}\n${filesTable.toString()}`,
                    {
                        title: 'PREVIEW',
                        titleAlignment: 'center',
                        borderColor: 'yellow'
                    }
                )
            );
        },

        async askCommitAction() {
            const actionTable = new Table({
                colWidths: [8, 22, 34],
                wordWrap: true,
                style: {
                    border: ['gray']
                }
            });

            for (const key of ['1', '2', '3']) {
                const [label, description] = formatActionLabel(key);
                actionTable.push([chalk.cyan(key), chalk.bold(label), chalk.gray(description)]);
            }

            writeLine(output);
            writeLine(output, chalk.bold('Next step'));
            writeLine(output, actionTable.toString());

            while (true) {
                const answer = await lineReader.ask(chalk.bold('Select') + chalk.gray(' [1/2/3] > '));

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
