// VoiceNotes MCP Cloudflare Worker
// Adds VoiceNotes tools to GARZA OS

const VOICENOTES_API = 'https://voicenotes-webhook.jadengarza.workers.dev';

// VoiceNotes Tools
const voicenotesTools = [
  {
    name: 'voicenotes_get_latest',
    description: 'Get the most recent VoiceNotes transcript',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'voicenotes_list_notes',
    description: 'List all VoiceNotes with optional filters',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Max notes to return (default 20)' },
        synced_only: { type: 'boolean', description: 'Only return notes synced to Craft' }
      }
    }
  },
  {
    name: 'voicenotes_get_note',
    description: 'Get a specific VoiceNotes transcript by ID',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'The note ID to retrieve' }
      },
      required: ['note_id']
    }
  },
  {
    name: 'voicenotes_sync',
    description: 'Trigger sync from VoiceNotes app to pull latest recordings',
    inputSchema: {
      type: 'object',
      properties: {},
      required: []
    }
  },
  {
    name: 'voicenotes_mark_synced',
    description: 'Mark a note as synced to Craft',
    inputSchema: {
      type: 'object',
      properties: {
        note_id: { type: 'string', description: 'The note ID to mark as synced' }
      },
      required: ['note_id']
    }
  }
];

// Tool handlers
async function handleVoicenotesTool(toolName, args) {
  try {
    switch (toolName) {
      case 'voicenotes_get_latest': {
        const resp = await fetch(`${VOICENOTES_API}/notes`);
        const data = await resp.json();
        if (!data.notes || data.notes.length === 0) {
          return { error: 'No notes found' };
        }
        const latest = data.notes.sort((a, b) => 
          new Date(b.created_at) - new Date(a.created_at)
        )[0];
        return {
          id: latest.id,
          transcript: latest.transcript,
          duration: latest.duration_seconds,
          created_at: latest.created_at,
          synced_to_craft: latest.synced_to_craft
        };
      }
      
      case 'voicenotes_list_notes': {
        const resp = await fetch(`${VOICENOTES_API}/notes`);
        const data = await resp.json();
        let notes = data.notes || [];
        if (args.synced_only) {
          notes = notes.filter(n => n.synced_to_craft);
        }
        notes = notes
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
          .slice(0, args.limit || 20);
        return {
          count: notes.length,
          notes: notes.map(n => ({
            id: n.id,
            transcript: n.transcript.substring(0, 200) + (n.transcript.length > 200 ? '...' : ''),
            duration: n.duration_seconds,
            created_at: n.created_at,
            synced: n.synced_to_craft
          }))
        };
      }
      
      case 'voicenotes_get_note': {
        const resp = await fetch(`${VOICENOTES_API}/notes/${args.note_id}`);
        if (!resp.ok) {
          return { error: `Note not found: ${args.note_id}` };
        }
        const note = await resp.json();
        return {
          id: note.id,
          transcript: note.transcript,
          duration: note.duration_seconds,
          created_at: note.created_at,
          synced_to_craft: note.synced_to_craft
        };
      }
      
      case 'voicenotes_sync': {
        const resp = await fetch(`${VOICENOTES_API}/sync`, { method: 'POST' });
        const data = await resp.json();
        return {
          synced: data.synced || 0,
          total: data.total || 0,
          message: data.message || 'Sync completed'
        };
      }
      
      case 'voicenotes_mark_synced': {
        const resp = await fetch(`${VOICENOTES_API}/notes/${args.note_id}/synced`, {
          method: 'POST'
        });
        if (!resp.ok) {
          return { error: `Failed to mark note as synced: ${args.note_id}` };
        }
        return { success: true, note_id: args.note_id };
      }
      
      default:
        return { error: `Unknown tool: ${toolName}` };
    }
  } catch (error) {
    return { error: error.message };
  }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    
    // Health check
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({ 
        status: 'ok', 
        voicenotes_tools: voicenotesTools.length 
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // List tools
    if (url.pathname === '/tools') {
      return new Response(JSON.stringify({ tools: voicenotesTools }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Execute tool
    if (url.pathname === '/execute' && request.method === 'POST') {
      const { tool, arguments: args } = await request.json();
      const result = await handleVoicenotesTool(tool, args || {});
      return new Response(JSON.stringify(result), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    return new Response('VoiceNotes MCP Worker', { status: 200 });
  }
};
