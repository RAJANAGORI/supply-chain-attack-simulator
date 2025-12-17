# Scenario 1: Typosquatting Attack 🎯

## 🎓 Learning Objectives

By completing this scenario, you will learn:
- How typosquatting attacks exploit human error
- Techniques attackers use to make malicious packages appear legitimate
- Data exfiltration methods in package managers
- Detection and prevention strategies

## 📖 Background

**Typosquatting** (also called **brandjacking**) is when attackers create malicious packages with names similar to popular legitimate packages, hoping developers will accidentally install them due to typos.

### Real-World Examples:
- `crossenv` vs `cross-env` (2017) - Stole environment variables
- `python3-dateutil` vs `python-dateutil` - Attempted credential theft
- `jeIlyfish` vs `jellyfish` - Used capital 'i' instead of lowercase 'L'

## 🎯 Scenario Description

You work for a security research team. Your task is to:

1. **Attacker Role**: Create a typosquatted package that mimics a popular library
2. **Victim Role**: Accidentally install the malicious package
3. **Defender Role**: Detect and prevent the attack

## 🔧 Setup

### Prerequisites
- Node.js 16+ and npm installed
- Python 3.8+ and pip installed
- Docker (optional, for isolated environment)

### Environment Setup

```bash
# Navigate to this scenario directory
cd scenarios/01-typosquatting

# Enable test bench mode (safety feature)
export TESTBENCH_MODE=enabled

# Run setup
./setup.sh
```

## 📝 Lab Tasks

### Part 1: Understanding the Target (15 minutes)

The legitimate package we'll target is called `requests-lib` (a fictional popular package).

**Your Tasks**:
1. Examine the legitimate package at `./legitimate/requests-lib/`
2. Understand what it does and how it's used
3. Identify potential typo variations

**Questions to Answer**:
- What are common typos users might make?
- Which characters are easily confused? (l vs 1, 0 vs O, etc.)
- How could you make a malicious package look legitimate?

### Part 2: Create the Typosquatted Package (20 minutes)

**Your Mission**: Create a malicious package named `request-lib` (missing 's')

**Requirements**:
1. The package must provide the same basic functionality as the original
2. It should exfiltrate data without obvious detection
3. The malicious behavior should be hidden or obfuscated

**Implementation Steps**:

1. Create the malicious package structure:
```bash
cd malicious-packages/
mkdir request-lib
cd request-lib
```

2. Follow the template in `./templates/malicious-package-template.js`

3. Your malicious code should:
   - Exfiltrate environment variables
   - Send data to a mock server (localhost only in testbench)
   - Still provide working functionality to avoid suspicion

**Safety Guardrails**:
- Your code MUST check for `process.env.TESTBENCH_MODE === 'enabled'`
- Exfiltration MUST only go to localhost:3000 (mock server)
- Include clear comments marking malicious sections

### Part 3: Deploy and Test (15 minutes)

1. **Start the Mock Attacker Server**:
```bash
cd ../../infrastructure
docker-compose up -d mock-server
```

2. **Publish to Local Registry**:
```bash
cd ../malicious-packages/request-lib
npm publish --registry http://localhost:4873
```

3. **Victim Scenario** - Install the typosquatted package:
```bash
cd ../../victim-app
npm install request-lib  # Oops, typo!
node index.js
```

4. **Observe the Attack**:
```bash
# Check what data was exfiltrated
curl http://localhost:3000/captured-data
```

### Part 4: Detection (20 minutes)

Now switch to the defender role. Your task is to detect the malicious package.

**Detection Methods**:

1. **Manual Code Review**:
```bash
cd node_modules/request-lib
cat package.json
cat index.js
```

Look for:
- Suspicious network requests
- Obfuscated code
- Unexpected dependencies
- Post-install scripts

2. **Automated Scanning**:
```bash
cd ../../detection-tools
npm install
node package-scanner.js ../victim-app
```

3. **Behavioral Analysis**:
```bash
# Monitor network traffic
./monitor-network.sh
```

**Questions**:
- What red flags did you find?
- Which detection method was most effective?
- Could this have been prevented?

### Part 5: Prevention & Mitigation (15 minutes)

Implement defenses:

1. **Package Lock Files**:
   - Examine how `package-lock.json` can help
   - Practice integrity checking

2. **Registry Security**:
   - Configure npm to verify package signatures
   - Set up scope restrictions

3. **Automated Tools**:
   - Configure Socket.dev integration
   - Set up Snyk scanning

4. **Code Review Checklist**:
   - Create a checklist for reviewing new dependencies

## ✅ Success Criteria

You've completed this scenario when you can:
- [ ] Successfully create a typosquatted package
- [ ] Demonstrate data exfiltration in the test environment
- [ ] Detect the malicious package using multiple methods
- [ ] Implement at least 3 preventive measures
- [ ] Explain the attack to a colleague

## 🎁 Bonus Challenges

1. **Advanced Obfuscation**: Use more sophisticated hiding techniques
2. **Unicode Tricks**: Create a package using Unicode lookalike characters
3. **Dependency Chain**: Hide malicious code in a sub-dependency
4. **Time-Delayed Attack**: Make the malicious behavior trigger after a delay
5. **Environment Detection**: Make it only activate in production environments

## 📚 Additional Resources

- [Real typosquatting incidents](../docs/real-incidents.md)
- [Package manager security best practices](../docs/best-practices.md)
- [Detection tool comparison](../docs/detection-tools.md)

## 🔗 Related Scenarios

After completing this scenario, try:
- **Scenario 2**: Dependency Confusion
- **Scenario 3**: Compromised Package

## 💡 Key Takeaways

- Typosquatting exploits human error and trust
- Malicious packages often provide working functionality to avoid detection
- Multiple layers of defense are necessary
- Automation is crucial for scanning large dependency trees
- Developer awareness and education are critical

## 🆘 Hints

<details>
<summary>Hint 1: How to exfiltrate data</summary>

Use Node.js `http` or `https` modules to send data:
```javascript
const http = require('http');

function exfiltrate(data) {
  if (process.env.TESTBENCH_MODE !== 'enabled') return;
  
  const payload = JSON.stringify(data);
  const options = {
    hostname: 'localhost',
    port: 3000,
    path: '/collect',
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  };
  
  // Send data (testbench environment only)
}
```
</details>

<details>
<summary>Hint 2: How to hide malicious code</summary>

Common obfuscation techniques:
- Base64 encoding
- Hex encoding  
- Splitting strings across variables
- Using eval() or Function() constructor
- Hiding in dependencies
- Conditional execution based on environment
</details>

<details>
<summary>Hint 3: Detection techniques</summary>

Look for:
- Network requests to external IPs
- Access to sensitive environment variables
- Unusual file system operations
- eval() or Function() usage
- Obfuscated code patterns
- Suspicious post-install scripts
</details>

## 📊 Lab Report Template

After completing the lab, document:

1. **Attack Execution**
   - Typo technique used
   - Exfiltration method
   - Success rate

2. **Detection Results**
   - Which tools detected it
   - False positives/negatives
   - Time to detect

3. **Lessons Learned**
   - Key insights
   - Surprising findings
   - Real-world applicability

---

**Next**: [Scenario 2: Dependency Confusion →](../02-dependency-confusion/README.md)

