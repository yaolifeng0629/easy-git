const ACTION_BY_FLAG = {
    '--push': 'commit-and-push',
    '--no-push': 'commit-only'
};

function parseMessageValue(argv, index, flag) {
    if (flag.startsWith('--message=')) {
        const value = flag.slice('--message='.length);

        if (!value) {
            return {
                error: '--message requires a value'
            };
        }

        return {
            value,
            nextIndex: index
        };
    }

    const value = argv[index + 1];

    if (!value || value.startsWith('-')) {
        return {
            error: `${flag} requires a value`
        };
    }

    return {
        value,
        nextIndex: index + 1
    };
}

function setAction(options, action, flag) {
    if (options.action && options.action !== action) {
        return {
            error: '--push and --no-push cannot be used together'
        };
    }

    options.action = action;

    return {
        ok: true
    };
}

export function parseCliArgs(argv = []) {
    const options = {};

    for (let index = 0; index < argv.length; index += 1) {
        const arg = argv[index];

        if (arg === '-m' || arg === '--message' || arg.startsWith('--message=')) {
            const parsed = parseMessageValue(argv, index, arg);

            if (parsed.error) {
                return {
                    ok: false,
                    reason: 'invalid-args',
                    error: parsed.error
                };
            }

            options.message = parsed.value;
            index = parsed.nextIndex;
            continue;
        }

        if (ACTION_BY_FLAG[arg]) {
            const result = setAction(options, ACTION_BY_FLAG[arg], arg);

            if (result.error) {
                return {
                    ok: false,
                    reason: 'invalid-args',
                    error: result.error
                };
            }

            continue;
        }

        return {
            ok: false,
            reason: 'invalid-args',
            error: `Unknown option: ${arg}`
        };
    }

    return {
        ok: true,
        options
    };
}
