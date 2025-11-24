// Test the new regex pattern with actual LinkedIn text

const testCases = [
  {
    input:
      "Chief Executive Officer at Invisible Technologies\nFormerly Senior Partner and Global Leader of QuantumBlack Labs at McKinsey & Company",
    expected: "Invisible Technologies",
  },
  {
    input: "CEO at Microsoft",
    expected: "Microsoft",
  },
  {
    input: "Software Engineer @ Google",
    expected: "Google",
  },
  {
    input: "Product Manager at Amazon Web Services",
    expected: "Amazon Web Services",
  },
  {
    input: "Director at McKinsey & Company",
    expected: "McKinsey & Company",
  },
  {
    input: "Founder and CEO at Startup.ai",
    expected: "Startup.ai",
  },
];

// The regex pattern from the code
const atPattern = /(?:\bat\s+|@\s+)([^\n]+?)(?:\n|Formerly|$)/i;

console.log("=== Testing 'at Company' Pattern ===\n");

testCases.forEach((test, index) => {
  const match = test.input.match(atPattern);
  const result = match ? match[1].trim() : null;
  const pass = result === test.expected;

  console.log(`Test ${index + 1}: ${pass ? "✅ PASS" : "❌ FAIL"}`);
  console.log(
    `Input: "${test.input.substring(0, 80)}${
      test.input.length > 80 ? "..." : ""
    }"`
  );
  console.log(`Expected: "${test.expected}"`);
  console.log(`Got: "${result}"`);
  console.log("");
});
