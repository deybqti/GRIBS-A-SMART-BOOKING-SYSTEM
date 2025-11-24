import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from './lib/supabase';

function OverviewCalendar() {
  // Calendar state
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    d.setHours(0,0,0,0);
    return d;
  });
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [calendarError, setCalendarError] = useState(null);
  const [dayCounts, setDayCounts] = useState({});
  const [dayBookings, setDayBookings] = useState({});
  const [selectedDateKey, setSelectedDateKey] = useState(null);

  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();
  const startOfMonth = useMemo(() => new Date(year, month, 1), [year, month]);
  const endOfMonth = useMemo(() => new Date(year, month + 1, 0, 23, 59, 59, 999), [year, month]);
  // Fixed total capacity as requested
  const totalRooms = 10;

  const formatKey = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  const buildMonthDays = () => {
    const firstWeekday = startOfMonth.getDay();
    const daysInMonth = endOfMonth.getDate();
    const days = [];
    for (let i = 0; i < firstWeekday; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    return days;
  };
  const monthDays = useMemo(buildMonthDays, [year, month]);

  // Fetch reservations overlapping month
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setCalendarLoading(true);
        setCalendarError(null);
        const startISO = new Date(year, month, 1).toISOString();
        const endISO = new Date(year, month + 1, 0, 23, 59, 59, 999).toISOString();
        const { data, error } = await supabase
          .from('reservations')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1000);
        if (error) throw error;

        const toISO = (r) => ({
          ci: r.checkin_at || r.check_in || r.start_date || r.created_at || null,
          co: r.checkout_at || r.check_out || r.end_date || null,
        });
        const overlaps = (ciISO, coISO, rsISO, reISO) => {
          if (!ciISO && !coISO) return false;
          const ci = ciISO ? new Date(ciISO) : null;
          const co = coISO ? new Date(coISO) : null;
          const rs = new Date(rsISO);
          const re = new Date(reISO);
          if (ci && !co) return ci <= re;
          if (!ci && co) return co >= rs;
          if (!ci && !co) return false;
          return ci <= re && co >= rs;
        };

        const monthBookings = (data || []).filter(r => {
          const { ci, co } = toISO(r);
          return overlaps(ci, co, startISO, endISO);
        });

        const counts = {};
        const buckets = {};
        const pushBooking = (key, booking) => {
          if (!buckets[key]) buckets[key] = [];
          buckets[key].push(booking);
        };
        for (const r of monthBookings) {
          const ciISO = toISO(r).ci;
          const coISO = toISO(r).co;
          const start = ciISO ? new Date(ciISO) : startOfMonth;
          const end = coISO ? new Date(coISO) : endOfMonth;
          const s = new Date(Math.max(start.getTime(), startOfMonth.getTime()));
          const e = new Date(Math.min(end.getTime(), endOfMonth.getTime()));
          const status = (r.status || '').toString().toLowerCase();
          const countsTowardOccupancy = !(status === 'cancelled' || status === 'rejected');
          for (let d = new Date(s); d <= e; d.setDate(d.getDate() + 1)) {
            const key = formatKey(d);
            if (countsTowardOccupancy) {
              counts[key] = (counts[key] || 0) + 1;
            }
            pushBooking(key, {
              id: r.id,
              guest: r.user_name || r.name || r.customer_name || 'Guest',
              room: r.room_name || r.room_no || r.room || 'Room',
              status: r.status || '—',
            });
          }
        }

        if (!cancelled) { setDayCounts(counts); setDayBookings(buckets); }
      } catch (e) {
        if (!cancelled) setCalendarError(e.message || 'Failed to load calendar');
      } finally {
        if (!cancelled) setCalendarLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [year, month, startOfMonth, endOfMonth]);

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Overview Calendar</h2>
      <div className="max-w-5xl mx-auto bg-[#232f47] rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-4">
          <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded" onClick={() => setMonthCursor(new Date(year, month - 1, 1))}>&lt;</button>
          <span className="text-xl font-semibold">{monthCursor.toLocaleString(undefined, { month: 'long', year: 'numeric' })}</span>
          <button className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded" onClick={() => setMonthCursor(new Date(year, month + 1, 1))}>&gt;</button>
        </div>
        {calendarError && <div className="mb-3 text-sm text-red-300">{calendarError}</div>}
        <div className="grid grid-cols-7 gap-2 text-center mb-2">
          {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(d => (
            <div key={d} className="font-semibold text-blue-300">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-2">
          {monthDays.map((d, idx) => {
            if (!d) return <div key={`b-${idx}`} className="h-20 rounded bg-[#1a253a]" style={{ opacity: 0 }} />;
            const key = formatKey(d);
            const booked = dayCounts[key] || 0;
            const cap = totalRooms || 1;
            const pct = Math.min(1, booked / cap);
            const color = pct <= 0.3 ? 'bg-green-600/80' : pct <= 0.7 ? 'bg-yellow-500/90' : 'bg-red-600/80';
            return (
              <button
                key={key}
                className="h-24 rounded bg-[#1a253a] text-white cursor-pointer hover:bg-[#223150] transition p-2 text-left flex flex-col justify-between"
                onClick={() => setSelectedDateKey(key)}
              >
                <div className="text-lg font-bold">{d.getDate()}</div>
                <div className={`text-[11px] text-white px-2 py-1 rounded self-start ${color}`}>{booked}/{cap} Booked</div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDateKey && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setSelectedDateKey(null)}>
          <div className="bg-white text-black rounded-lg w-full max-w-xl p-6 relative" onClick={e => e.stopPropagation()}>
            <button className="absolute right-4 top-2 text-2xl" onClick={() => setSelectedDateKey(null)}>&times;</button>
            <h3 className="text-lg font-bold mb-2">Bookings on {selectedDateKey}</h3>
            {calendarLoading ? (
              <div className="text-sm text-gray-600">Loading...</div>
            ) : (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {(dayBookings[selectedDateKey] || []).length === 0 ? (
                  <div className="text-sm text-gray-600">No bookings for this date.</div>
                ) : (
                  (dayBookings[selectedDateKey] || [])
                    .slice()
                    .sort((a, b) => {
                      const pri = (s) => {
                        s = (s || '').toString().toLowerCase();
                        if (s.includes('confirmed') || s.includes('checked-in')) return 0;
                        if (s.includes('paid') || s.includes('reserved')) return 1;
                        if (s.includes('checked out')) return 2;
                        if (s.includes('pending')) return 3;
                        if (s.includes('rejected') || s.includes('cancelled')) return 4;
                        return 5;
                      };
                      return pri(a.status) - pri(b.status);
                    })
                    .map((b) => {
                      const status = (b.status || '—').toString();
                      const s = status.toLowerCase();
                      const isCheckedOut = s.includes('checked out') || s.includes('checked-out') || s.includes('checkedout');
                      const cls = s.includes('cancel') || s.includes('reject')
                        ? 'bg-red-100 text-red-700 border border-red-200'
                        : isCheckedOut
                        ? 'bg-green-100 text-green-700 border border-green-200'
                        : s.includes('pending')
                        ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                        : 'bg-green-100 text-green-700 border border-green-200';
                      const label = status.charAt(0).toUpperCase() + status.slice(1);
                      return (
                        <div key={b.id} className="border rounded px-3 py-2 flex items-center justify-between bg-white">
                          <div>
                            <div className="font-semibold text-sm">{b.guest || 'Guest'}</div>
                            <div className="text-xs text-gray-600">Room: {b.room || '—'}</div>
                          </div>
                          <div className={`text-xs px-2 py-1 rounded ${cls}`}>{label}</div>
                        </div>
                      );
                    })
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default OverviewCalendar;
