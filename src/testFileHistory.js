const { getFileCommits, formatRelativeTime } = require('./fileHistory');

// Test configuration
// Replace with your GitHub token
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || 'your-github-token-here';

async function runTests() {
  console.log('🧪 Testing File History Function\n');
  console.log('=' .repeat(60));

  // Test 1: Valid file in a public repository
  console.log('\n📝 Test 1: Valid file in public repo (README.md)');
  const test1 = await getFileCommits('octocat/Hello-World', 'README', 5, GITHUB_TOKEN);
  console.log('Success:', test1.success);
  console.log('File:', test1.file);
  console.log('Commits found:', test1.commits.length);
  if (test1.commits.length > 0) {
    console.log('First commit:', test1.commits[0].message);
    console.log('Author:', test1.commits[0].author);
    console.log('Date:', formatRelativeTime(test1.commits[0].date));
  }
  console.log('Error:', test1.error);

  // Test 2: File that doesn't exist
  console.log('\n' + '=' .repeat(60));
  console.log('\n📝 Test 2: Non-existent file');
  const test2 = await getFileCommits('octocat/Hello-World', 'nonexistent-file.txt', 5, GITHUB_TOKEN);
  console.log('Success:', test2.success);
  console.log('Error:', test2.error);

  // Test 3: Invalid repository
  console.log('\n' + '=' .repeat(60));
  console.log('\n📝 Test 3: Invalid repository');
  const test3 = await getFileCommits('invalid/repo-that-doesnt-exist-12345', 'README.md', 5, GITHUB_TOKEN);
  console.log('Success:', test3.success);
  console.log('Error:', test3.error);

  // Test 4: Invalid repository format
  console.log('\n' + '=' .repeat(60));
  console.log('\n📝 Test 4: Invalid repository format (missing owner)');
  const test4 = await getFileCommits('invalid-repo-format', 'README.md', 5, GITHUB_TOKEN);
  console.log('Success:', test4.success);
  console.log('Error:', test4.error);

  // Test 5: File path with special characters
  console.log('\n' + '=' .repeat(60));
  console.log('\n📝 Test 5: File path with spaces/special chars');
  const test5 = await getFileCommits('octocat/Hello-World', 'src/main file.js', 5, GITHUB_TOKEN);
  console.log('Success:', test5.success);
  console.log('Error:', test5.error);

  // Test 6: Deep nested file path
  console.log('\n' + '=' .repeat(60));
  console.log('\n📝 Test 6: Deep nested file path');
  const test6 = await getFileCommits('facebook/react', 'packages/react/src/React.js', 5, GITHUB_TOKEN);
  console.log('Success:', test6.success);
  console.log('File:', test6.file);
  console.log('Commits found:', test6.commits.length);
  if (test6.commits.length > 0) {
    console.log('First commit:', test6.commits[0].message);
    console.log('URL:', test6.commits[0].url);
  }

  // Test 7: Missing GitHub token
  console.log('\n' + '=' .repeat(60));
  console.log('\n📝 Test 7: Missing GitHub token');
  const test7 = await getFileCommits('octocat/Hello-World', 'README', 5, null);
  console.log('Success:', test7.success);
  console.log('Error:', test7.error);

  console.log('\n' + '=' .repeat(60));
  console.log('\n✅ All tests completed!');
  console.log('\n💡 Tips:');
  console.log('  - Make sure to set GITHUB_TOKEN environment variable');
  console.log('  - Test with your own repositories for more accurate results');
  console.log('  - Check rate limits if you get 403 errors');
}

// Run tests
runTests().catch(error => {
  console.error('❌ Test failed:', error);
  process.exit(1);
});
