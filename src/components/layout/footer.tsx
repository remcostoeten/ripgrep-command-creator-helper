import { createResource } from 'solid-js'

type Commit = {
    sha: string
    commit: {
        message: string
        author: {
            date: string
        }
    }
}

const GITHUB_API_URL = 'https://api.github.com/repos/remcostoeten/ripgrep-command-creator-helper/commits'
const BASE_VERSION = { major: 1, minor: 0, patch: 1 }

let latestCommitCache: { data: CommitData | null, timestamp: number } = { data: null, timestamp: 0 }

async function fetchLatestCommit(): Promise<CommitData | null> {
    const now = Date.now()

    // cache is fresh for 10 minutes
    if (latestCommitCache.data && (now - latestCommitCache.timestamp) < 10 * 60 * 1000) {
        return latestCommitCache.data
    }

    try {
        const res = await fetch('https://api.github.com/repos/remcostoeten/ripgrep-command-creator-helper/commits')
        const json = await res.json()

        const latest = Array.isArray(json) ? json[0] : null

        if (latest) {
            latestCommitCache = {
                data: latest,
                timestamp: now
            }
            return latest
        }

        return null
    } catch (e) {
        console.error('Failed to fetch latest commit', e)
        return null
    }
}

export function Footer() {
    const [commit] = createResource(fetchLatestCommit)

    const version = () => {
        if (!commit.latest) return 'v1.0.1'
        const patch = BASE_VERSION.patch + 1
        return `${BASE_VERSION.major}.${BASE_VERSION.minor}.${patch}`
    }

    return (
        <footer class="footer">
            <div class="footer__top">
                <span>
                    Press <kbd>/</kbd> to focus search • Press <kbd>Enter</kbd> to generate • Built by <a href="https://github.com/remcostoeten" target="_blank">Remco Stoeten</a> utilizing <kbd>Solid.JS</kbd>
                </span>
            </div>
            <div class="footer__bottom">
                <span>Version <kbd>{version()}</kbd></span>
                {commit() && (
                    <>
                        <span>• {commit().commit.message}</span>
                        <span>• {new Date(commit().commit.author.date).toLocaleString()}</span>
                    </>
                )}
            </div>
        </footer>
    )
}
