import 'dotenv/config';
import http from 'http';
import bcrypt from 'bcryptjs';
import app from './app.js';
import { loadKeys, PRIVATE_KEY, PUBLIC_KEY } from './config/keys.js';
import { generateAccessToken, verifyToken } from './middlewares/auth.js';
import { presenceService } from './services/presenceService.js';

const runTests = async () => {
  console.log('==================================================');
  console.log('         CollabSpace Backend Diagnostics           ');
  console.log('==================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, message) => {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passed++;
    } else {
      console.error(`[FAIL] ${message}`);
      failed++;
    }
  };

  try {
    // ----------------------------------------------------
    // Test 1: Cryptography & Key Management
    // ----------------------------------------------------
    console.log('Testing Module 1: Cryptography & Key Generation...');
    const keys = loadKeys();
    assert(PRIVATE_KEY && PUBLIC_KEY, 'RSA Asymmetric keys successfully loaded/generated');
    assert(PRIVATE_KEY.includes('PRIVATE KEY') && PUBLIC_KEY.includes('PUBLIC KEY'), 'Keys contain valid PEM markers');

    // ----------------------------------------------------
    // Test 2: JWT Sign and Verify with RS256
    // ----------------------------------------------------
    console.log('\nTesting Module 2: JWT Tokens RS256 Signing & Verification...');
    const mockUser = { _id: '60c72b2f9b1d8b2bad6f140f', email: 'test@collabspace.com', name: 'Test User' };
    const token = generateAccessToken(mockUser);
    assert(token && token.split('.').length === 3, 'JWT Token signed successfully');

    const decoded = verifyToken(token);
    assert(decoded && decoded.email === mockUser.email && decoded.name === mockUser.name, 'JWT Token verified and signature matches');

    // ----------------------------------------------------
    // Test 3: Password Hashing Integrity
    // ----------------------------------------------------
    console.log('\nTesting Module 3: Password Hashing Integrity (Bcrypt)...');
    const plainPassword = 'SuperSecretPassword123';
    const salt = await bcrypt.genSalt(12);
    const hash = await bcrypt.hash(plainPassword, salt);
    assert(hash && hash.startsWith('$2a$') || hash.startsWith('$2b$'), 'Bcrypt generated valid blowfish hash');
    
    const isMatch = await bcrypt.compare(plainPassword, hash);
    assert(isMatch, 'Bcrypt verified correct password successfully');
    
    const isNotMatch = await bcrypt.compare('WrongPassword123', hash);
    assert(!isNotMatch, 'Bcrypt rejected incorrect password correctly');

    // ----------------------------------------------------
    // Test 4: Presence Management Service
    // ----------------------------------------------------
    console.log('\nTesting Module 4: Active Presence Engine...');
    const socketId = 'socket-client-12345';
    presenceService.setUserActive(socketId, {
      userId: mockUser._id,
      name: mockUser.name,
      email: mockUser.email,
      avatar: 'avatar.png',
      workspaceId: 'workspace-5555',
      documentId: 'doc-7777',
      boardId: null
    });

    const collaborators = presenceService.getDocumentCollaborators('doc-7777');
    assert(collaborators.length === 1 && collaborators[0].userId === mockUser._id, 'Presence tracker records active users in document room');

    presenceService.setUserHeartbeat(socketId);
    const sessionDetails = presenceService.removeUserSocket(socketId);
    assert(sessionDetails && sessionDetails.userId === mockUser._id, 'Presence tracker cleans up sessions on socket disconnect');

    // ----------------------------------------------------
    // Test 5: REST API Server Mounting & Route Hits
    // ----------------------------------------------------
    console.log('\nTesting Module 5: REST API Route Router Integration...');
    
    // Start Express on a random ephemeral port for validation
    const server = http.createServer(app);
    await new Promise((resolve) => server.listen(0, resolve));
    const port = server.address().port;
    const testUrl = `http://localhost:${port}`;

    try {
      // 5.1 Base status check
      const statusRes = await fetch(`${testUrl}/status`);
      const statusData = await statusRes.json();
      assert(statusRes.status === 200 && statusData.status === 'OK', 'GET /status returns operational code');

      // 5.2 Validate registration validation limits
      const regRes = await fetch(`${testUrl}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: 'Test' }) // missing email & password
      });
      const regData = await regRes.json();
      assert(regRes.status === 400 && regData.message.includes('required'), 'POST /api/auth/register handles bad payload schema validation errors');

      // 5.3 Validate unauthorized protection on workspace
      const wsRes = await fetch(`${testUrl}/api/workspaces/60c72b2f9b1d8b2bad6f140f`);
      const wsData = await wsRes.json();
      assert(wsRes.status === 401 && wsData.message.includes('token'), 'GET /api/workspaces/:id rejects unauthorized calls without JWT');

    } catch (fetchErr) {
      console.error('Fetch testing error:', fetchErr);
      failed++;
    } finally {
      // Close testing server listener
      server.close();
    }

    // ----------------------------------------------------
    // Diagnostic Summary
    // ----------------------------------------------------
    console.log('\n==================================================');
    console.log('              DIAGNOSTIC REPORT SUMMARY            ');
    console.log('==================================================');
    console.log(`Total Passed Tests: ${passed}`);
    console.log(`Total Failed Tests: ${failed}`);
    console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
    console.log('==================================================\n');

  } catch (error) {
    console.error('Critical test sequence exception:', error);
  }
};

runTests();
