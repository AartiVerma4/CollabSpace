import 'dotenv/config';
import http from 'http';
import mongoose from 'mongoose';
import app from './app.js';
import { generateAccessToken } from './middlewares/auth.js';

// Mongoose Models
import { User } from './models/User.js';
import { Workspace } from './models/Workspace.js';
import { Document } from './models/Document.js';
import { DocVersion } from './models/DocVersion.js';
import { Board } from './models/Board.js';
import { Comment } from './models/Comment.js';
import { Message } from './models/Message.js';
import { Notification } from './models/Notification.js';
import { Invitation } from './models/Invitation.js';
import { ActivityLog } from './models/ActivityLog.js';

// Setup Mock User Details
const mockUserId = new mongoose.Types.ObjectId('60c72b2f9b1d8b2bad6f140f');
const mockWorkspaceId = new mongoose.Types.ObjectId('60c72b2f9b1d8b2bad6f140a');
const mockDocumentId = new mongoose.Types.ObjectId('60c72b2f9b1d8b2bad6f140b');
const mockBoardId = new mongoose.Types.ObjectId('60c72b2f9b1d8b2bad6f140c');
const mockCommentId = new mongoose.Types.ObjectId('60c72b2f9b1d8b2bad6f140d');
const mockVersionId = new mongoose.Types.ObjectId('60c72b2f9b1d8b2bad6f140e');
const mockNotificationId = new mongoose.Types.ObjectId('60c72b2f9b1d8b2bad6f1407');

const mockUser = {
  _id: mockUserId,
  name: 'Aarti Verma',
  email: 'aarti@example.com',
  avatar: 'https://avatar.png'
};

const mockWorkspace = {
  _id: mockWorkspaceId,
  name: 'SaaS Launch Workspace',
  slug: 'saas-launch',
  ownerId: mockUserId,
  members: [{ userId: mockUserId, role: 'Owner' }]
};

// ==========================================
// Mongoose Models Stubs (Query Chain Builder)
// ==========================================

const makeQueryChain = (result) => {
  const query = {
    sort: () => query,
    limit: () => query,
    populate: () => query,
    exec: async () => result,
    then: (resolve, reject) => {
      if (resolve) return Promise.resolve(result).then(resolve);
      return Promise.resolve(result);
    },
    catch: (reject) => {}
  };
  return query;
};

// User Mocks (Synchronous to prevent auto-promise wrap)
User.findOne = async (query) => {
  if (query.email === 'newuser@example.com') return null;
  if (query.email === 'collaborator@example.com') {
    // Unenrolled collaborator
    const c = new User({ name: 'Collaborator', email: 'collaborator@example.com' });
    c._id = new mongoose.Types.ObjectId('60c72b2f9b1d8b2bad6f1409');
    return c;
  }
  const u = new User({ ...mockUser, passwordHash: 'hashed' });
  u.comparePassword = async () => true;
  u._id = mockUserId;
  return u;
};
User.findById = () => {
  const u = new User(mockUser);
  return makeQueryChain(u);
};
User.prototype.save = async function() { return this; };

// Workspace Mocks
Workspace.findOne = async () => null; // for slug check
Workspace.findById = () => {
  const ws = new Workspace(mockWorkspace);
  return makeQueryChain(ws);
};
Workspace.findByIdAndDelete = async () => true;
Workspace.prototype.save = async function() { return this; };

// Document Mocks
Document.findById = () => {
  const doc = new Document({
    _id: mockDocumentId,
    workspaceId: mockWorkspaceId,
    title: 'Backend Spec Requirements',
    content: { ops: [] },
    authorId: mockUserId,
    version: 1
  });
  return makeQueryChain(doc);
};
Document.findOne = () => {
  const doc = new Document({
    _id: mockDocumentId,
    workspaceId: mockWorkspaceId,
    title: 'Backend Spec Requirements',
    content: { ops: [] },
    authorId: mockUserId,
    version: 1
  });
  return makeQueryChain(doc);
};
Document.find = () => {
  const docs = [new Document({ _id: mockDocumentId, title: 'Backend Spec Requirements' })];
  return makeQueryChain(docs);
};
Document.prototype.save = async function() { return this; };

// DocVersion Mocks
DocVersion.findById = () => {
  const dv = new DocVersion({
    _id: mockVersionId,
    documentId: mockDocumentId,
    content: { ops: [] },
    authorId: mockUserId,
    version: 1
  });
  return makeQueryChain(dv);
};
DocVersion.find = () => {
  const versions = [new DocVersion({ _id: mockVersionId, version: 1 })];
  return makeQueryChain(versions);
};
DocVersion.prototype.save = async function() { return this; };

// Board Mocks
Board.findById = () => {
  const board = new Board({
    _id: mockBoardId,
    workspaceId: mockWorkspaceId,
    title: 'Canvas Board',
    objects: [],
    authorId: mockUserId
  });
  return makeQueryChain(board);
};
Board.find = () => {
  const boards = [new Board({ _id: mockBoardId, title: 'Canvas Board' })];
  return makeQueryChain(boards);
};
Board.findByIdAndDelete = async () => true;
Board.prototype.save = async function() { return this; };

// Comment Mocks
Comment.find = () => {
  const comments = [new Comment({ _id: mockCommentId, documentId: mockDocumentId, text: 'Hello' })];
  return makeQueryChain(comments);
};
Comment.findById = () => {
  const comment = new Comment({
    _id: mockCommentId,
    documentId: mockDocumentId,
    text: 'Hello',
    replies: [],
    authorId: mockUserId
  });
  return makeQueryChain(comment);
};
Comment.prototype.save = async function() { return this; };

// Message Mocks
Message.find = () => {
  const msgs = [new Message({ _id: 'msg-1', text: 'Welcome team' })];
  return makeQueryChain(msgs);
};
Message.findById = () => {
  const msg = new Message({ _id: 'msg-1', text: 'Welcome' });
  return makeQueryChain(msg);
};
Message.prototype.save = async function() { return this; };

// Invitation Mocks
Invitation.findOne = async () => new Invitation({
  workspaceId: mockWorkspaceId,
  email: 'aarti@example.com', // Match logged in email to accept invite
  role: 'Editor',
  token: 'mock-token',
  expiresAt: new Date(Date.now() + 10000)
});
Invitation.findByIdAndDelete = async () => true;
Invitation.prototype.save = async function() { return this; };

// Notification Mocks
Notification.find = () => {
  const list = [new Notification({ _id: mockNotificationId, userId: mockUserId, type: 'mention' })];
  return makeQueryChain(list);
};
Notification.updateMany = async () => true;
Notification.findOneAndUpdate = () => {
  const notif = new Notification({ _id: mockNotificationId, read: true });
  return makeQueryChain(notif);
};
Notification.prototype.save = async function() { return this; };

// ActivityLog Mocks
ActivityLog.find = () => {
  const list = [new ActivityLog({ action: 'document_created', target: 'Test Document' })];
  return makeQueryChain(list);
};
ActivityLog.prototype.save = async function() { return this; };

// ==========================================
// Test Runner
// ==========================================

const testAllEndpoints = async () => {
  console.log('==================================================');
  console.log('         CollabSpace Full API Test Suite          ');
  console.log('==================================================\n');

  // Start Express on ephemeral port
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;

  // Generate a valid JWT token using mock credentials
  const token = generateAccessToken(mockUser);
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  let passed = 0;
  let failed = 0;

  const testRoute = async (name, method, endpoint, body = null, headers = { 'Content-Type': 'application/json' }) => {
    try {
      const config = { method, headers };
      if (body) {
        config.body = JSON.stringify(body);
      }
      const response = await fetch(`${baseUrl}${endpoint}`, config);
      const data = await response.json();

      if (response.status >= 200 && response.status < 300) {
        console.log(`[PASS] ${name} (${method} ${endpoint}) -> Status: ${response.status}`);
        passed++;
      } else {
        console.error(`[FAIL] ${name} (${method} ${endpoint}) -> Status: ${response.status}. Msg: ${JSON.stringify(data)}`);
        failed++;
      }
    } catch (err) {
      console.error(`[ERROR] ${name} (${method} ${endpoint}) -> ${err.message}`);
      failed++;
    }
  };

  // 1. Authentication REST API
  console.log('Testing Authentication Endpoints...');
  await testRoute('Register User', 'POST', '/api/auth/register', { name: 'Aarti Verma', email: 'newuser@example.com', password: 'Password123' });
  await testRoute('Login User', 'POST', '/api/auth/login', { email: 'aarti@example.com', password: 'Password123' });
  await testRoute('Google OAuth Login', 'POST', '/api/auth/google', { googleId: '1103949', email: 'aarti@example.com', name: 'Aarti Verma' });
  await testRoute('Refresh Token', 'POST', '/api/auth/refresh', { refreshToken: token });
  await testRoute('Logout User', 'POST', '/api/auth/logout');
  await testRoute('Forgot Password', 'POST', '/api/auth/forgot-password', { email: 'aarti@example.com' });

  // 2. Workspaces REST API
  console.log('\nTesting Workspace Endpoints...');
  await testRoute('Create Workspace', 'POST', '/api/workspaces', { name: 'SaaS Launch Workspace', slug: 'saas-launch' }, authHeaders);
  await testRoute('Get Workspace Details', 'GET', `/api/workspaces/${mockWorkspaceId}`, null, authHeaders);
  await testRoute('Update Workspace', 'PATCH', `/api/workspaces/${mockWorkspaceId}`, { name: 'New Title' }, authHeaders);
  await testRoute('Invite Workspace Member', 'POST', `/api/workspaces/${mockWorkspaceId}/invite`, { email: 'collaborator@example.com', role: 'Editor' }, authHeaders);
  await testRoute('Accept Workspace Invitation', 'POST', '/api/workspaces/accept-invite', { token: 'mock-token' }, authHeaders);
  await testRoute('Update Workspace Member Role', 'PATCH', `/api/workspaces/${mockWorkspaceId}/members/${mockUserId}`, { role: 'Admin' }, authHeaders);
  await testRoute('Get Workspace Activity Feed', 'GET', `/api/workspaces/${mockWorkspaceId}/activity`, null, authHeaders);

  // 3. Documents REST API
  console.log('\nTesting Document Endpoints...');
  await testRoute('Create Document', 'POST', '/api/documents', { workspaceId: mockWorkspaceId, title: 'Spec Spec v1' }, authHeaders);
  await testRoute('List Workspace Documents', 'GET', `/api/documents?workspaceId=${mockWorkspaceId}`, null, authHeaders);
  await testRoute('Get Document details', 'GET', `/api/documents/${mockDocumentId}`, null, authHeaders);
  await testRoute('Update Document Metadata', 'PATCH', `/api/documents/${mockDocumentId}`, { title: 'Updated Specs' }, authHeaders);
  await testRoute('Get Document Version History', 'GET', `/api/documents/${mockDocumentId}/versions`, null, authHeaders);
  await testRoute('Restore Document version', 'POST', `/api/documents/${mockDocumentId}/restore/${mockVersionId}`, null, authHeaders);
  await testRoute('Generate Sharing Link', 'POST', `/api/documents/${mockDocumentId}/share`, { permission: 'Viewer' }, authHeaders);
  await testRoute('Add Comment thread', 'POST', `/api/documents/${mockDocumentId}/comments`, { anchorRange: { index: 0, length: 1 }, text: 'Look here' }, authHeaders);
  await testRoute('Resolve/Edit Comment thread', 'PATCH', `/api/documents/${mockDocumentId}/comments/${mockCommentId}`, { resolved: true }, authHeaders);

  // 4. Boards (Design Canvas) REST API
  console.log('\nTesting Boards (Canvas) Endpoints...');
  await testRoute('Create Design Board', 'POST', '/api/boards', { workspaceId: mockWorkspaceId, title: 'Web Layout Board' }, authHeaders);
  await testRoute('List Workspace Boards', 'GET', `/api/boards?workspaceId=${mockWorkspaceId}`, null, authHeaders);
  await testRoute('Get Board Details', 'GET', `/api/boards/${mockBoardId}`, null, authHeaders);
  await testRoute('Update Board objects', 'PATCH', `/api/boards/${mockBoardId}`, { title: 'Updated Board Title', objects: [] }, authHeaders);

  // 5. Chat & Notifications REST API
  console.log('\nTesting Chat & Notifications Endpoints...');
  await testRoute('Post Channel Message', 'POST', '/api/chat/messages', { workspaceId: mockWorkspaceId, channelId: 'general', text: 'Hi team!' }, authHeaders);
  await testRoute('Get Channel Chat History', 'GET', `/api/chat/messages?workspaceId=${mockWorkspaceId}&channelId=general`, null, authHeaders);
  await testRoute('Get Active Notifications', 'GET', '/api/chat/notifications', null, authHeaders);
  await testRoute('Mark Notification Read', 'PATCH', `/api/chat/notifications/${mockNotificationId}`, null, authHeaders);
  await testRoute('Clear All Notifications', 'PATCH', '/api/chat/notifications/all', null, authHeaders);

  // Clean up server
  server.close();

  console.log('\n==================================================');
  console.log('             REST API TEST SUITE SUMMARY          ');
  console.log('==================================================');
  console.log(`Passed Routes: ${passed}`);
  console.log(`Failed Routes: ${failed}`);
  console.log(`Success Rate: ${Math.round((passed / (passed + failed)) * 100)}%`);
  console.log('==================================================\n');
};

testAllEndpoints();
