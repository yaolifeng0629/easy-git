import readlineCb from 'readline';
import chalk from 'chalk';
import boxen from 'boxen';
import { formatCommitGuide, formatInvalidCommitMessage } from './commit-message.js';

function writeLine(stream, message = '') {
    stream.write(`${message}\n`);
}

export function createCli({
    input = process.stdin,
    output = process.stdout,
    errorOutput = process.stderr
} = {}) {
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
            const readline = readlineCb.createInterface({
                input,
                output
            });

            return new Promise(resolve => {
                readline.question('Please enter a submission message: ', message => {
                    readline.close();
                    resolve(message);
                });
            });
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
        }
    };
}
