// Explicit opt-in, authenticated private trip sharing. No background location collection.
async function sha256(value) { return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(n => n.toString(16).padStart(2, '0')).join(''); }
export class Crew {
  constructor(backend) { this.backend = backend; }
  async ready() {
    if (!this.backend?.client) throw Error('Live crew sharing needs the private preview service and a signed-in account. Offline trip packets work without it.');
    const { data, error } = await this.backend.client.auth.getUser();
    if (error || !data.user) throw Error('Sign in to Drivers Lounge before joining or sharing a live trip.');
    this.userId = data.user.id; this.client = this.backend.client; return this;
  }
  async result(query) { const { data, error } = await query; if (error) throw Error(/42P01|PGRST205|PGRST202/.test(error.code || '') ? 'Live crew sharing is not enabled on this environment. Use an offline trip packet.' : 'Crew service unavailable or access revoked. Your local permit wallet is still available.'); return data; }
  async publish(trip) {
    await this.ready();
    const existing = await this.result(this.client.from('dl_permit_trips').select('revision,owner_id,snapshot,closed').eq('id', trip.id).maybeSingle());
    if (existing && existing.owner_id !== this.userId) throw Error('Only the trip owner can publish this route.');
    if (existing?.closed) throw Error('This crew trip is closed. Start a new permitted load for another move.');
    const snapshot = JSON.parse(JSON.stringify(trip)); delete snapshot.shared;
    if (existing && JSON.stringify(existing.snapshot) === JSON.stringify(snapshot)) return { id: trip.id, revision: existing.revision, owner: true };
    // Originals remain in the private device wallet and explicit export packet.
    if (!existing) await this.result(this.client.from('dl_permit_trips').insert({ id: trip.id, owner_id: this.userId, snapshot, revision: 1 }));
    else await this.result(this.client.from('dl_permit_trips').update({ snapshot, revision: existing.revision + 1 }).eq('id', trip.id).eq('revision', existing.revision).select('id').single());
    return { id: trip.id, revision: existing ? existing.revision + 1 : 1, owner: true };
  }
  async invite(tripId, role) {
    await this.ready(); const token = crypto.randomUUID();
    await this.result(this.client.from('dl_permit_invites').insert({ trip_id: tripId, owner_id: this.userId, role, token_hash: await sha256(token) }));
    return token;
  }
  async join(token) {
    await this.ready(); const tripId = await this.result(this.client.rpc('dl_join_permit_trip', { invite_token: token.trim() }));
    const trip = await this.read(tripId), membership = await this.result(this.client.from('dl_permit_members').select('role').eq('trip_id', tripId).eq('user_id', this.userId).single());
    return { ...trip, role: membership.role };
  }
  async read(tripId) { return this.result(this.client.from('dl_permit_trips').select('id,revision,closed,snapshot,owner_id').eq('id', tripId).single()); }
  async accept(shared) { await this.ready(); await this.result(this.client.from('dl_permit_members').update({ accepted_revision: shared.revision }).eq('trip_id', shared.id).eq('user_id', this.userId)); }
  async positions(shared) { return this.result(this.client.from('dl_permit_positions').select('*').eq('trip_id', shared.id).eq('revision', shared.revision)); }
  async members(shared) { return this.result(this.client.from('dl_permit_members').select('user_id,role,accepted_revision').eq('trip_id', shared.id)); }
  async revoke(shared, userId) { return this.result(this.client.from('dl_permit_members').delete().eq('trip_id', shared.id).eq('user_id', userId)); }
  async position(shared, fix, progress) {
    if (!this.userId) return;
    await this.result(this.client.from('dl_permit_positions').upsert({ trip_id: shared.id, user_id: this.userId, latitude: fix.point[0], longitude: fix.point[1], accuracy: fix.accuracy, progress_m: progress, revision: shared.revision }, { onConflict: 'trip_id,user_id' }));
  }
  async stop(shared) { if (this.client && this.userId && shared) await this.result(this.client.from('dl_permit_positions').delete().eq('trip_id', shared.id).eq('user_id', this.userId)); }
  async close(shared) { await this.ready(); await this.result(this.client.from('dl_permit_trips').update({ closed: true }).eq('id', shared.id)); }
}
