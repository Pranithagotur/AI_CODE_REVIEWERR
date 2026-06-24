import { runStaticRules } from '../services/ruleEngine';

const buggyJsCode = `
// Test JavaScript code review
const my_secret_key = "abc123xyz_token_value_key";
var unused_variable = 42;
let camelCaseVar = 10;

function readData() {
  const data = JSON.parse("{invalid json}"); // Potential missing try-catch
  return data;
}

while(true) {
  // Infinite loop check
  console.log("looping...");
}
`;

const buggyPythonCode = `
# Test Python code review
mySecretKey = "super_private_token_xyz"
unused_var = 100

def fetch_content():
    # File operation outside try-except
    f = open("data.txt")
    return f.read()

while True:
    print("Infinite Loop")
`;

const buggyCppCode = `
// Test C++ code review
#include <iostream>

int main() {
    int* ptr = new int[10]; // Memory leak check
    
    while(true) {
        std::cout << "Infinite loop" << std::endl;
    }
    // delete[] ptr; is missing
    return 0;
}
`;

console.log('--- TESTING STATIC RULE VALIDATION ENGINE ---');

console.log('\n[TESTING JAVASCRIPT]');
const jsViolations = runStaticRules('javascript', buggyJsCode);
console.log(JSON.stringify(jsViolations, null, 2));

console.log('\n[TESTING PYTHON]');
const pyViolations = runStaticRules('python', buggyPythonCode);
console.log(JSON.stringify(pyViolations, null, 2));

console.log('\n[TESTING C++]');
const cppViolations = runStaticRules('cpp', buggyCppCode);
console.log(JSON.stringify(cppViolations, null, 2));

console.log('\n--- TESTS COMPLETED ---');
