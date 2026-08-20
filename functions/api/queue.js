export async function onRequestGet(context) {
    try {
        const result = await context.env.DB.prepare(
            "SELECT * FROM queue_state WHERE id = 1"
        ).first();
        
        return Response.json(result || { last_called_ticket: null, counter_number: 1 });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        
        if (body.action === 'call') {
            const { ticket_number, counter_number } = body;
            
            // Update queue state
            await context.env.DB.prepare(
                "UPDATE queue_state SET last_called_ticket = ?, counter_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1"
            ).bind(ticket_number, counter_number).run();
            
            // Update reservation status to Dipanggil
            await context.env.DB.prepare(
                "UPDATE reservations SET status = 'Dipanggil', counter_number = ? WHERE queue_number = ?"
            ).bind(counter_number, ticket_number).run();
            
            return Response.json({ success: true });
        } 
        else if (body.action === 'complete') {
            await context.env.DB.prepare(
                "UPDATE reservations SET status = 'Selesai' WHERE queue_number = ?"
            ).bind(body.ticket_number).run();
            return Response.json({ success: true });
        }
        else if (body.action === 'cancel') {
            await context.env.DB.prepare(
                "UPDATE reservations SET status = 'Batal' WHERE queue_number = ?"
            ).bind(body.ticket_number).run();
            return Response.json({ success: true });
        }
        
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
