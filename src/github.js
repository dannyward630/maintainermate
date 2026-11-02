// Tiny GitHub REST client using built-in fetch (no dependencies).

const MAX_REPOSITORY_GUIDELINES_CHARS = 8000;

function client(token, fetchImpl = fetch) {
  async function gh(method, path, body) {
    const res = await fetchImpl(`https://api.github.com${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "maintainermate",
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const error = new Error(`GitHub ${method} ${path} -> ${res.status}: ${await res.text()}`);
      error.status = res.status;
      throw error;
    }
    return res.status === 204 ? null : res.json();
  }

  async function getRepositoryGuidelines(repo) {
    const path = "/contents/.github/maintainermate.md";
    try {
      const file = await gh("GET", `/repos/${repo}${path}`);
      if (file.type !== "file" || file.encoding !== "base64" || typeof file.content !== "string") {
        throw new Error(`GitHub GET /repos/${repo}${path} returned unsupported file content.`);
      }
      const content = Buffer.from(file.content.replace(/\s/g, ""), "base64").toString("utf8").trim();
      return content ? content.slice(0, MAX_REPOSITORY_GUIDELINES_CHARS) : null;
    } catch (error) {
      if (error.status === 404) return null;
      throw error;
    }
  }

  return {
    getRepositoryGuidelines,
    getPull: (repo, n) => gh("GET", `/repos/${repo}/pulls/${n}`),
    getPullFiles: (repo, n) => gh("GET", `/repos/${repo}/pulls/${n}/files?per_page=100`),
    getIssue: (repo, n) => gh("GET", `/repos/${repo}/issues/${n}`),
    listComments: (repo, n) => gh("GET", `/repos/${repo}/issues/${n}/comments?per_page=100`),
    createComment: (repo, n, body) => gh("POST", `/repos/${repo}/issues/${n}/comments`, { body }),
    updateComment: (repo, id, body) => gh("PATCH", `/repos/${repo}/issues/comments/${id}`, { body }),
    addLabels: (repo, n, labels) => gh("POST", `/repos/${repo}/issues/${n}/labels`, { labels }),
  };
}

module.exports = { client };
