<h1 style="text-align: center;">commitgo</h1>
<p style="text-align: center;"><span> English | <a href= "./README.zh.md"> 中文 </a></span></p>
<p style="text-align: center;">commitgo is a command-line tool written in Node.js that simplifies and automates your git submission process.</p>

<p style="display: flex; justify-content: center; align-items: center;">
<img src="./screenzy.png" width="70%"/>
</p>

>
>   `If you don't want to force verification of submission format, please install version@1.1.6, otherwise, install version@1.1.6 or above`
>

## Function

-   Automatically detect if the current directory is a git repository
-   If it is a git warehouse, you will be prompted to enter a submission message
-   Automatically execute `git add.`、`Git commit - m "<message>" ` and `git push` commands

## 🚀 Usage
1.  global installation
```bash
pnpm install -g commitgo

npm install -g commitgo
```
2. open a terminal
```bash
commitgo

# Enter commit information
# Enter

# Shortcut options
commitgo -m "feat: add shortcut flags" --no-push
commitgo --message "fix: push safely" --push

# Tips:
# Command line input easy Press Tab key to complete automatically, no need to manually type the name
```

## ⚠️ Precautions

-   Ensure that Node.js and git are installed on your machine
-   Ensure that you have configured the correct remote warehouse in the git repository

## 🙌 contribution

-   We welcome all contributions and suggestions. If you want to contribute to Delete Repository, you can:
    -   submit bug reports or recommendations
    -   submit code improvements or new features
    -   improve documentation

-   thanks to all those who have contributed to Delete Repository! 🎉
