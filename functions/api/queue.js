export async function onRequestGet(context) {
    try {
        const result = await context.env.DB.prepare(
            "SELECT * FROM queue_state WHERE id = 1"
        ).first();
        
        return Response.json(result || { last_called_ticket: null, counter_number: 1, updated_at: null });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        
        if (body.action === 'call') {
            const { ticket_number, counter_number } = body;
            
            // Update queue state (updated_at berubah setiap panggilan, termasuk panggil ulang)
            await context.env.DB.prepare(
                "UPDATE queue_state SET last_called_ticket = ?, counter_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = 1"
            ).bind(ticket_number, counter_number).run();
            
            // Update reservation status to Dipanggil
            await context.env.DB.prepare(
                "UPDATE reservations SET status = 'Dipanggil', counter_number = ? WHERE ticket_number = ?"
            ).bind(counter_number, ticket_number).run();
            
            return Response.json({ success: true });
        } 
        else if (body.action === 'complete') {
            await context.env.DB.prepare(
                "UPDATE reservations SET status = 'Selesai' WHERE ticket_number = ?"
            ).bind(body.ticket_number).run();
            return Response.json({ success: true });
        }
        else if (body.action === 'cancel') {
            await context.env.DB.prepare(
                "UPDATE reservations SET status = 'Batal' WHERE ticket_number = ?"
            ).bind(body.ticket_number).run();
            return Response.json({ success: true });
        }
        else if (body.action === 'clear_all') {
            await context.env.DB.prepare("DELETE FROM reservations").run();
            await context.env.DB.prepare(
                "UPDATE queue_state SET last_called_ticket = NULL, counter_number = 1, updated_at = CURRENT_TIMESTAMP WHERE id = 1"
            ).run();
            return Response.json({ success: true });
        }
        
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
