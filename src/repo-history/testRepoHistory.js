const { getRepoCommits } = require('./repoHistory');

// Test and return exact JSON for other devs
async function test() {
  const result = await getRepoCommits('runtime-core', 5);
  console.log(JSON.stringify(result, null, 2));
}

test();
