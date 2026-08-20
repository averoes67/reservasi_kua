export async function onRequestGet(context) {
    try {
        const { results } = await context.env.DB.prepare(
            "SELECT * FROM reservations ORDER BY id ASC"
        ).all();
        return Response.json(results);
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}

export async function onRequestPost(context) {
    try {
        const body = await context.request.json();
        
        // Count existing reservations for the day to generate ticket number
        const { count } = await context.env.DB.prepare(
            "SELECT COUNT(*) as count FROM reservations WHERE reserve_date = ?"
        ).bind(body.reserveDate).first();
        
        const nextNum = count + 1;
        const ticketNumber = `A-${nextNum.toString().padStart(3, '0')}`;
        
        await context.env.DB.prepare(
            "INSERT INTO reservations (ticket_number, full_name, phone_number, reserve_date, time_slot, purpose, status) VALUES (?, ?, ?, ?, ?, ?, ?)"
        ).bind(
            ticketNumber,
            body.fullName,
            body.phoneNumber,
            body.reserveDate,
            body.timeSlot,
            body.purpose,
            'Menunggu'
        ).run();
        
        return Response.json({ success: true, ticketNumber: ticketNumber }, { status: 201 });
    } catch (e) {
        return Response.json({ error: e.message }, { status: 500 });
    }
}
