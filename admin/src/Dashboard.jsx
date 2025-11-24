import React, { useEffect, useState } from 'react';
import { dashboardApi } from './lib/supabase';
import { LogIn, LogOut, Home, DollarSign } from 'lucide-react';
import './Dashboard.css';

function Dashboard() {
  const [stats, setStats] = useState({
    todayCheckIns: 0,
    todayCheckOuts: 0,
    totalAvailableRooms: 0,
    totalOccupiedRooms: 0,
    checkInChange: '+0',
    checkOutChange: '+0',
    availableChange: '0',
    occupiedChange: '0',
  });
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        const [statsData, roomsData] = await Promise.all([
          dashboardApi.getDashboardStats(),
          dashboardApi.getDashboardRooms(),
        ]);
        setStats(statsData);
        setRooms(roomsData);
        setError(null);
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();

    // Refresh data every 30 seconds
    const interval = setInterval(fetchDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  

  if (loading) {
    return (
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 p-8 overflow-y-auto">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </main>
    );
  }

  return (
    <main className="dashboard-main">
      {/* Overview Cards */}
      <section className="mb-8">
        <div className="section-header">
          <h2 className="section-title">Overview</h2>
        </div>
        <div className="overview-grid">
          {[
            { 
              title: "Today's Check-in", 
              value: stats.todayCheckIns, 
              change: `${stats.checkInChange} from yesterday`, 
              icon: <LogIn size={24} className="text-blue-500" /> 
            },
            { 
              title: "Today's Check-out", 
              value: stats.todayCheckOuts, 
              change: `${stats.checkOutChange} from yesterday`, 
              icon: <LogOut size={24} className="text-blue-500" /> 
            },
            { 
              title: 'Total Available Rooms', 
              value: stats.totalAvailableRooms, 
              change: `${stats.availableChange} since yesterday`, 
              icon: <Home size={24} className="text-green-500" /> 
            },
            { 
              title: 'Total Occupied Rooms', 
              value: stats.totalOccupiedRooms, 
              change: `${stats.occupiedChange} since yesterday`, 
              icon: <Home size={24} className="text-amber-500" /> 
            },
            { 
              title: 'Total Revenue', 
              value: `₱${(stats.totalRevenue || 0).toLocaleString()}`, 
              change: 'from confirmed bookings', 
              icon: <DollarSign size={24} className="text-emerald-500" /> 
            },
          ].map((card, idx) => (
            <div key={idx} className="overview-card">
              <div className="card-row">
                <span className="card-title">{card.title}</span>
                <div className="card-icon flex items-center justify-center">
                  {card.icon}
                </div>
              </div>
              <div className="card-value">{card.value}</div>
              <div className="card-change">{card.change}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Rooms Section */}
      <section className="mb-8">
        <div className="section-header">
          <h2 className="section-title">Rooms</h2>
          <button className="btn-outline" onClick={() => (window.location.href = '/rooms')}>View All Rooms</button>
        </div>
        <div className="rooms-grid">
          {/* Room Cards */}
          {rooms.length > 0 ? (
            rooms.map((room, idx) => (
              <div key={room.id || idx} className="room-card">
                <img
                  src={room.images && room.images.length > 0 ? room.images[0] : 'https://via.placeholder.com/400x200?text=No+Image'}
                  alt={room.name}
                  className="room-image"
                />
                <div className="room-body">
                  <div className="room-name">{room.name}</div>
                  <div className="room-occupied">{room.occupied} occupied</div>
                  <div className="room-price">₱{room.price.toLocaleString()}/night</div>
                  <div className="room-amenities">
                    {room.amenities && room.amenities.length > 0 ? (
                      room.amenities.map((amenity, i) => (
                        <span key={i} className="room-amenity">{amenity}</span>
                      ))
                    ) : (
                      <span className="room-amenity muted">No amenities listed</span>
                    )}
                  </div>
                  <div className="room-actions">
                    <button className="btn-view" onClick={() => (window.location.href = '/rooms')}>View Details</button>
                    <button className="btn-bookings" onClick={() => (window.location.href = '/bookings')}>View Bookings</button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="col-span-full text-center py-8 text-gray-400">
              No rooms available.{' '}
              <button className="text-blue-400 hover:text-blue-300 underline" onClick={() => (window.location.href = '/rooms')}>
                Add your first room
              </button>
            </div>
          )}
        </div>
      </section>

      

      {/* Room Status */}
      <section>
        <h2 className="section-title mb-4">Room Status Overview</h2>
        <div className="status-panel">
          <div className="status-grid">
            <div className="status-item">
              <div className="status-available">{stats.totalAvailableRooms}</div>
              <div className="status-label">Available Rooms</div>
            </div>
            <div className="status-item">
              <div className="status-occupied">{stats.totalOccupiedRooms}</div>
              <div className="status-label">Occupied Rooms</div>
            </div>
            <div className="status-item">
              <div className="status-maint">{rooms.filter((room) => room.status === 'maintenance').length}</div>
              <div className="status-label">Under Maintenance</div>
            </div>
          </div>
          <div className="status-updated">Last updated: {new Date().toLocaleTimeString()}</div>
        </div>
      </section>
    </main>
  );
}

export default Dashboard;
