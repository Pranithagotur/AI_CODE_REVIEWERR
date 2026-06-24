import { executeCode } from '../services/sandbox';

async function testSandbox() {
  console.log('--- TESTING RUNTIME EXECUTION SANDBOX ---');

  // Test Case 1: Valid JavaScript
  console.log('\n[TEST 1: Valid JavaScript]');
  const res1 = await executeCode('javascript', 'console.log("Hello Sandbox!");');
  console.log('Success:', res1.success);
  console.log('Output:', res1.output.trim());
  console.log('Time (ms):', res1.executionTimeMs);

  // Test Case 2: Python Division By Zero (Runtime Error)
  console.log('\n[TEST 2: Python ZeroDivisionError Exception]');
  const res2 = await executeCode('python', 'print("Start")\na = 10\nb = 0\nc = a / b\nprint("End")');
  console.log('Success:', res2.success);
  console.log('Error:', res2.error);
  console.log('Parsed Line:', res2.line);
  console.log('Suggested Fix:', res2.fix);

  // Test Case 3: Python Infinite Loop (Timeout)
  console.log('\n[TEST 3: Python Infinite Loop Timeout]');
  const res3 = await executeCode('python', 'import time\nwhile True:\n    pass');
  console.log('Success:', res3.success);
  console.log('Error:', res3.error);
  console.log('Suggested Fix:', res3.fix);
  console.log('Time (ms):', res3.executionTimeMs);

  console.log('\n--- SANDBOX TESTS COMPLETED ---');
}

testSandbox().catch(console.error);
