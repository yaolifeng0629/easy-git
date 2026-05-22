export const COMMIT_TYPES = [
    ['feat', '新功能'],
    ['fix', '修复 bug'],
    ['docs', '文档修改'],
    ['release', '版本发布记录'],
    ['style', '样式修改(ui 校验)'],
    ['workflow', '工作流相关修改'],
    ['types', '项目数据类型的修改'],
    ['ci', '自动化流程配置或脚本修改'],
    ['revert', '回退某个 commit 提交'],
    ['wip', '备份当前进度（表示还未完成）'],
    ['build', '构建系统或外部依赖项的更改'],
    ['perf', '优化相关，比如提升性能、体验'],
    ['dx', '开发体验相关修改，例如构建流程'],
    ['chore', '其他修改, 比如构建流程、依赖管理'],
    ['refactor', '重构代码(无功能、无 bug 修复)'],
    ['test', '增加测试，包括单元测试、集成测试等']
];

const COMMIT_TYPE_PATTERN = COMMIT_TYPES.map(([type]) => type).join('|');
const COMMIT_MESSAGE_RE = new RegExp(
    `^(revert: )?(${COMMIT_TYPE_PATTERN})(\\(.+\\))?: .{1,50}$`
);

export function validateCommitMessage(message) {
    if (!COMMIT_MESSAGE_RE.test(message)) {
        return {
            valid: false,
            reason: 'invalid-format'
        };
    }

    return {
        valid: true
    };
}

export function formatCommitGuide() {
    return COMMIT_TYPES.map(([type]) => type).join(', ');
}

export function formatInvalidCommitMessage(message, chalk) {
    return (
        `  ${chalk.white(chalk.bgRed(' ERROR: '))} ${chalk.yellowBright(`${message}`)} ${chalk.red(
            'invalid commit message format.'
        )}\n\n` +
        chalk('Proper commit message format is required for automated changelog generation. \n\nExamples:\n\n') +
        `    ${chalk.green("feat(scope): add 'comments' option")}\n` +
        `    ${chalk.green('fix(scope): handle events on blur (close #28)')}\n\n` +
        chalk.gray('We refer to the vue3 scheme for more details: \n') +
        chalk.gray.underline('https://github.com/vuejs/core/blob/main/.github/commit-convention.md \n')
    );
}
