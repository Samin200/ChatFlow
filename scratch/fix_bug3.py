import re
import os

filepath = '/Users/saminsafwan/Documents/Projects/ChatFlow/discord-ui-component-implementation/single-file-chatflow-backend/index.js'

with open(filepath, 'r') as f:
    content = f.read()

# Logic to inject
status_logic = """
      // Bug 3 Fix: Check if any other participant is online to mark as delivered immediately
      const recipients = (chat.participants || []).filter(p => String(p) !== req.userId);
      const isAnyRecipientOnline = recipients.some(pid => {
        const entry = onlineUsers.get(String(pid));
        return entry && entry.isOnline;
      });
      if (isAnyRecipientOnline) messageDoc.status = 'delivered';
"""

# 1. Update /api/messages/:chatId
pattern1 = r"(const messageDoc = \{.*?status: 'sent',.*?clientMessageId: clientMessageId \|\| null,.*?\};)"
def repl1(m):
    return m.group(1).replace("status: 'sent',", f"status: 'sent',\n{status_logic}")

# 2. Update /api/messages/upload
pattern2 = r"(const messageDoc = \{.*?status: 'sent',.*?updatedAt: now,.*?\};)"
def repl2(m):
    return m.group(1).replace("status: 'sent',", f"status: 'sent',\n{status_logic}")

# We'll just do a more direct string replacement since the structures are unique enough
if "status: 'sent'," in content:
    # Standard message route
    content = content.replace(
        "clientMessageId: clientMessageId || null, status: 'sent',",
        "clientMessageId: clientMessageId || null, status: 'sent'," + status_logic
    )
    # Upload route
    content = content.replace(
        "duration: parsedDuration, status: 'sent',",
        "duration: parsedDuration, status: 'sent'," + status_logic
    )

with open(filepath, 'w') as f:
    f.write(content)

print("Successfully applied Bug 3 status tick fixes via direct replacement.")
