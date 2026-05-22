# commitgo

commitgo 是一个简单的命令行工具，用来把日常 Git 提交变得更安全、更省事。

它会检查当前仓库、校验提交信息、预览本次改动文件，并让你选择是否推送。

![commitgo 使用流程](./assets/commitgo-workflow.svg)

## 功能

- 提交前预览改动文件
- 按 Conventional Commits 校验提交信息
- 可以选择提交并推送、只提交、取消
- 在正常终端里支持上下方向键选择
- 支持快捷参数，减少重复输入
- 安全传递提交信息，避免命令拼接问题

## 安装

```bash
npm install -g commitgo
```

或者：

```bash
pnpm install -g commitgo
```

## 使用

在 Git 仓库中运行：

```bash
commitgo
```

输入提交信息后，commitgo 会展示本次将要提交的文件。

```text
commitgo

Types: feat, fix, docs, release, style, workflow, types, ci, revert, wip, build, perf, dx, chore, refactor, test
Format: type(scope): message

Message:
  > feat: add shortcut flags

Message
  feat: add shortcut flags

Files
  M  src/main.js
  M  src/commit-workflow.js
  A  src/args.js

Action
  > commit + push
    commit only
    cancel
```

## 快捷参数

跳过提交信息输入：

```bash
commitgo -m "feat: add shortcut flags"
```

只提交，不推送：

```bash
commitgo -m "feat: add shortcut flags" --no-push
```

直接提交并推送：

```bash
commitgo --message "fix: push safely" --push
```

## 提交信息格式

commitgo 支持这些提交类型：

```text
feat, fix, docs, release, style, workflow, types, ci, revert, wip, build, perf, dx, chore, refactor, test
```

示例：

```bash
feat: add shortcut flags
fix(cli): handle invalid action
docs: rewrite readme
```

## 使用要求

- Node.js 14 或更高版本
- Git
- 如果需要推送，请先配置好远程仓库

## 本地开发

```bash
pnpm install
pnpm test
```

## License

ISC
