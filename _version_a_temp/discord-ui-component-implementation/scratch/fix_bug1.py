import re
import os

filepath = '/Users/saminsafwan/Documents/Projects/ChatFlow/discord-ui-component-implementation/single-file-chatflow-backend/index.js'

with open(filepath, 'r') as f:
    content = f.read()

# 1. Update /api/messages/:chatId
pattern1 = r"app\.post\('/api/messages/:chatId', auth, async \(req, res\) => \{\s+try \{\s+const chatId = ensureChatIdString\(req\.params\.chatId\);\s+if \(!chatId\) return errorResponse\(res, 400, 'Invalid chatId', 'INVALID_CHAT_ID'\);\s+\s+const chat = await db\.collection\('chats'\)\.findOne\(\{ _id: toObjectId\(chatId\), participants: req\.userId \}, \{ projection: \{ _id: 1, participants: 1 \} \}\);\s+if \(!chat\) return errorResponse\(res, 403, 'Not a participant of this chat', 'NOT_PARTICIPANT'\);"
replacement1 = "app.post('/api/messages/:chatId', auth, async (req, res) => {\n    try {\n      const chat = await resolveChat(db, req.userId, req.params.chatId);\n      if (!chat) return errorResponse(res, 400, 'Invalid chat or user ID', 'INVALID_CHAT_ID');\n      const chatId = String(chat._id);"

content = re.sub(pattern1, replacement1, content)

# 2. Update /api/messages/upload
pattern2 = r"app\.post\('/api/messages/upload', auth, upload\.single\('file'\), async \(req, res\) => \{\s+try \{\s+if \(!req\.file\) return errorResponse\(res, 400, 'No file uploaded', 'NO_FILE'\);\s+\s+const \{ chatId, type, duration, clientMessageId \} = req\.body;\s+console\.log\(\"Upload received — body:\", req\.body, \"file:\", req\.file\?\.originalname\);\s+if \(!chatId\) return errorResponse\(res, 400, 'chatId is required', 'MISSING_CHAT_ID'\);\s+\s+const chatObjId = toObjectId\(chatId\);\s+if \(!chatObjId\) return errorResponse\(res, 400, 'Invalid chatId', 'INVALID_CHAT_ID'\);\s+\s+const chat = await db\.collection\('chats'\).findOne\(\s+\{ _id: chatObjId, participants: req\.userId \},\s+\{ projection: \{ _id: 1, participants: 1 \} \}\s+\);\s+if \(!chat\) return errorResponse\(res, 403, 'Not a participant of this chat', 'NOT_PARTICIPANT'\);"
replacement2 = "app.post('/api/messages/upload', auth, upload.single('file'), async (req, res) => {\n    try {\n      if (!req.file) return errorResponse(res, 400, 'No file uploaded', 'NO_FILE');\n\n      const { chatId: rawChatId, type, duration, clientMessageId } = req.body;\n      console.log(\"Upload received — body:\", req.body, \"file:\", req.file?.originalname);\n\n      const chat = await resolveChat(db, req.userId, rawChatId);\n      if (!chat) return errorResponse(res, 400, 'Invalid chatId or recipient', 'INVALID_CHAT_ID');\n      const chatId = String(chat._id);"

content = re.sub(pattern2, replacement2, content)

with open(filepath, 'w') as f:
    f.write(content)

print("Successfully applied Bug 1 fixes.")
