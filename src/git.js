import { spawnSync } from 'child_process';

function defaultRunGit(args, options = {}) {
    const result = spawnSync('git', args, {
        encoding: 'utf8',
        stdio: options.stdio ?? 'pipe'
    });

    if (result.error) {
        throw result.error;
    }

    if (result.status !== 0) {
        const output = [result.stderr, result.stdout].filter(Boolean).join('\n').trim();
        throw new Error(output || `git ${args.join(' ')} failed`);
    }

    return result.stdout ?? '';
}

export function createGitAdapter({ runGit = defaultRunGit } = {}) {
    return {
        isRepository() {
            try {
                return runGit(['rev-parse', '--is-inside-work-tree']).trim() === 'true';
            } catch {
                return false;
            }
        },

        hasChanges() {
            return runGit(['status', '--porcelain']).trim().length > 0;
        },

        getCurrentBranch() {
            return runGit(['branch', '--show-current']).trim();
        },

        addAll() {
            runGit(['add', '.'], { stdio: 'inherit' });
        },

        commit(message) {
            runGit(['commit', '-m', message], { stdio: 'inherit' });
        },

        push(branch) {
            runGit(['push', 'origin', branch], { stdio: 'inherit' });
        }
    };
}
