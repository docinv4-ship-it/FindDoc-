import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import admin from 'firebase-admin';

// 1. 🚀 ENTERPRISE FIREBASE INITIALIZATION (Singleton Pattern to prevent memory leaks)
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            // Vercel env variables mein next-line characters ka issue fix karne ke liye
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
        }),
    });
}

// 2. Supabase Admin Client (Bypass RLS)
const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
    try {
        // 🛡️ SECURITY CHECK: Koi aur server is URL ko hit na kar sake, sirf Supabase karega
        const authHeader = req.headers.get('authorization');
        if (authHeader !== `Bearer ${process.env.WEBHOOK_SECRET}`) {
            return NextResponse.json({ error: 'Unauthorized Access' }, { status: 401 });
        }

        // 📦 PAYLOAD PARSING: Supabase se naya notification data capture karna
        const payload = await req.json();
        
        // Supabase webhook naye row ko "record" object ke andar bhejta hai
        const notification = payload.record; 

        // Sirf INSERT operations par push bhejna hai (updates/deletes par nahi)
        if (payload.type !== 'INSERT' || !notification) {
            return NextResponse.json({ message: 'Ignored non-insert event' });
        }

        // 🔍 FETCH DEVICE TOKEN: Mobile par bhejney ke liye user ka FCM token chahiye
        // Hum check karenge ke user doctor hai ya patient, aur us table se token nikalenge
        let fcmToken = null;
        
        if (notification.user_type === 'doctor') {
            const { data } = await supabase
                .from('doctors')
                .select('fcm_token')
                .eq('id', notification.user_id)
                .single();
            fcmToken = data?.fcm_token;
        } else {
            const { data } = await supabase
                .from('patients')
                .select('fcm_token')
                .eq('id', notification.user_id)
                .single();
            fcmToken = data?.fcm_token;
        }

        // Agar user ne app uninstall kar di hai ya token missing hai, to graceful exit (app crash nahi hogi)
        if (!fcmToken) {
            console.log(`No FCM token found for user ${notification.user_id}. Saved in DB only.`);
            return NextResponse.json({ success: true, message: 'Saved in DB, no push token found.' });
        }

        // ⚡ SEND FIREBASE PUSH NOTIFICATION TO LOCK SCREEN
        const pushMessage = {
            token: fcmToken,
            notification: {
                title: notification.title,
                body: notification.body,
            },
            data: {
                // Mobile app ko batane ke liye ke click karne par kahan jana hai
                route: notification.type === 'new_message' ? '/chat' : '/appointments', 
                appointment_id: notification.data?.appointment_id || '',
                conversation_id: notification.data?.conversation_id || '',
                click_action: 'FLUTTER_NOTIFICATION_CLICK', // Flutter/React Native compatibility
            },
        };

        const response = await admin.messaging().send(pushMessage);

        return NextResponse.json({ success: true, messageId: response });

    } catch (error: any) {
        console.error('🔥 CRITICAL PUSH ERROR:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
