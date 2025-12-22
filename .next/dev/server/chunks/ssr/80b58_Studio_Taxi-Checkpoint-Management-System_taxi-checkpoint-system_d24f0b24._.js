module.exports = [
"[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/lib/actions/operator-actions.ts [app-rsc] (ecmascript)", ((__turbopack_context__) => {
"use strict";

/* __next_internal_action_entry_do_not_use__ [{"007e13ac973a60f047cd6d666d91168cf666d2dc3f":"getOperatorsAction","4029516d851c389a991c1b07ed5a6e18d81a05dd6a":"deleteOperatorAction","40c6da10abb7235b9a0385982ce07d7890af4cf6d5":"createOperatorAction"},"",""] */ __turbopack_context__.s([
    "createOperatorAction",
    ()=>createOperatorAction,
    "deleteOperatorAction",
    ()=>deleteOperatorAction,
    "getOperatorsAction",
    ()=>getOperatorsAction
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/node_modules/@supabase/supabase-js/dist/index.mjs [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/node_modules/next/headers.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i("[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/node_modules/@supabase/ssr/dist/module/index.js [app-rsc] (ecmascript) <locals>");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/node_modules/@supabase/ssr/dist/module/createServerClient.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
// Creates a Supabase client with the Service Role Key for administrative tasks
const getAdminClient = ()=>{
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f40$supabase$2f$supabase$2d$js$2f$dist$2f$index$2e$mjs__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$locals$3e$__["createClient"])(("TURBOPACK compile-time value", "https://cqrieqpvautbnjyxsxwf.supabase.co"), process.env.SUPABASE_SERVICE_ROLE_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
};
// Normal user client to check permissions
const getUserClient = async ()=>{
    const cookieStore = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f$next$2f$headers$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["cookies"])();
    return (0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f40$supabase$2f$ssr$2f$dist$2f$module$2f$createServerClient$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createServerClient"])(("TURBOPACK compile-time value", "https://cqrieqpvautbnjyxsxwf.supabase.co"), ("TURBOPACK compile-time value", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmllcXB2YXV0Ym5qeXhzeHdmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjYwNDQwNTgsImV4cCI6MjA4MTYyMDA1OH0.LomIpokfGX7TKjassn-KDIGqkLX63TJbLoGf-qlQbOk"), {
        cookies: {
            getAll () {
                return cookieStore.getAll();
            },
            setAll (cookiesToSet) {
                try {
                    cookiesToSet.forEach(({ name, value, options })=>cookieStore.set(name, value, options));
                } catch  {
                // Ignore if called in a Server Component
                }
            }
        }
    });
};
async function createOperatorAction(formData) {
    const supabase = await getUserClient();
    // 1. Verify the requester is an admin
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Non authentifié");
    const { data: admin } = await supabase.from("operators").select("role").eq("id", user.id).single();
    if (admin?.role !== "admin") {
        throw new Error("Accès refusé : Seuls les administrateurs peuvent créer des opérateurs");
    }
    const adminClient = getAdminClient();
    // 2. Create the user in Supabase Auth
    // We use a temporary dummy password that they should change, 
    // or we can just send an invite. For this demo, let's set a default one.
    const tempPassword = "Password123!";
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email: formData.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
            full_name: formData.fullName
        }
    });
    if (authError) throw authError;
    // 3. Create the operator profile in the operators table
    const { error: profileError } = await adminClient.from("operators").insert({
        id: authData.user.id,
        full_name: formData.fullName,
        badge_number: formData.badgeNumber,
        checkpoint_id: formData.checkpointId,
        role: 'operator'
    });
    if (profileError) {
        // Cleanup the auth user if profile creation fails
        await adminClient.auth.admin.deleteUser(authData.user.id);
        throw profileError;
    }
    return {
        success: true,
        message: "Compte opérateur créé avec succès"
    };
}
async function getOperatorsAction() {
    const supabase = await getUserClient();
    const { data, error } = await supabase.from("operators").select("*, checkpoint:checkpoints(name)").order("created_at", {
        ascending: false
    });
    if (error) throw error;
    return data;
}
async function deleteOperatorAction(id) {
    const supabase = await getUserClient();
    // Verify admin status
    const { data: { user } } = await supabase.auth.getUser();
    const { data: admin } = await supabase.from("operators").select("role").eq("id", user?.id).single();
    if (admin?.role !== "admin") throw new Error("Accès refusé");
    const adminClient = getAdminClient();
    // Delete from Auth (which cascades to operators table due to REFERENCES auth.users(id) ON DELETE CASCADE)
    const { error } = await adminClient.auth.admin.deleteUser(id);
    if (error) throw error;
    return {
        success: true
    };
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    createOperatorAction,
    getOperatorsAction,
    deleteOperatorAction
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createOperatorAction, "40c6da10abb7235b9a0385982ce07d7890af4cf6d5", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(getOperatorsAction, "007e13ac973a60f047cd6d666d91168cf666d2dc3f", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteOperatorAction, "4029516d851c389a991c1b07ed5a6e18d81a05dd6a", null);
}),
"[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/.next-internal/server/app/admin/page/actions.js { ACTIONS_MODULE0 => \"[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/lib/actions/operator-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$lib$2f$actions$2f$operator$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/lib/actions/operator-actions.ts [app-rsc] (ecmascript)");
;
;
;
}),
"[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/.next-internal/server/app/admin/page/actions.js { ACTIONS_MODULE0 => \"[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/lib/actions/operator-actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "007e13ac973a60f047cd6d666d91168cf666d2dc3f",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$lib$2f$actions$2f$operator$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getOperatorsAction"],
    "4029516d851c389a991c1b07ed5a6e18d81a05dd6a",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$lib$2f$actions$2f$operator$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deleteOperatorAction"],
    "40c6da10abb7235b9a0385982ce07d7890af4cf6d5",
    ()=>__TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$lib$2f$actions$2f$operator$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["createOperatorAction"]
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f2e$next$2d$internal$2f$server$2f$app$2f$admin$2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$lib$2f$actions$2f$operator$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/.next-internal/server/app/admin/page/actions.js { ACTIONS_MODULE0 => "[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/lib/actions/operator-actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
var __TURBOPACK__imported__module__$5b$project$5d2f$Documents$2f$Innovation_Studio$2f$Taxi$2d$Checkpoint$2d$Management$2d$System$2f$taxi$2d$checkpoint$2d$system$2f$lib$2f$actions$2f$operator$2d$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/Documents/Innovation_Studio/Taxi-Checkpoint-Management-System/taxi-checkpoint-system/lib/actions/operator-actions.ts [app-rsc] (ecmascript)");
}),
];

//# sourceMappingURL=80b58_Studio_Taxi-Checkpoint-Management-System_taxi-checkpoint-system_d24f0b24._.js.map