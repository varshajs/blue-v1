import React, { useState, useEffect } from "react";
import axios from "axios";

// --- UI COMPONENTS (VISUALS FROM CODE 2) ---

const FoodStall = ({ name, emoji, color, position, desc }) => (
  <div className={`absolute ${position} flex flex-col items-center z-20 group cursor-help`}>
    <div
      className={`w-12 h-12 ${color} rounded-full shadow-lg border-4 border-white flex items-center justify-center text-2xl transform transition-transform group-hover:scale-110`}
    >
      {emoji}
    </div>
    <div className="bg-white px-3 py-1 rounded-full shadow-md border border-stone-200 mt-2 -space-y-0.5 text-center">
      <p className="text-[10px] font-bold uppercase tracking-wider text-stone-800">{name}</p>
      <p className="text-[8px] text-stone-400 font-medium">{desc}</p>
    </div>
  </div>
);

const ChairIcon = ({ id, x, y, rotation, status, isSelected, isSearched, onSelect }) => {
  // Visual zone logic for the SVG Map (From Code 2)
  const getZoneStyle = (id) => {
    if (id <= 25) return { bg: "#bfdbfe", border: "#3b82f6", text: "#1e3a8a" }; // Blue
    if (id <= 50) return { bg: "#fed7aa", border: "#f97316", text: "#7c2d12" }; // Orange
    if (id <= 75) return { bg: "#fecaca", border: "#ef4444", text: "#7f1d1d" }; // Red
    return { bg: "#bbf7d0", border: "#22c55e", text: "#14532d" }; // Green
  };

  const getStatusColor = () => {
    if (isSearched) return { fill: "#facc15", stroke: "#eab308", strokeWidth: 2 };
    if (status === "occupied") return { fill: "#d1d5db", stroke: "#6b7280" };
    if (isSelected) return { fill: "#4A403A", stroke: "#000", strokeWidth: 1.5, text: "#fff" };
    
    const zone = getZoneStyle(id);
    return { fill: zone.bg, stroke: zone.border, text: zone.text };
  };

  const colors = getStatusColor();

  return (
    <g
      transform={`translate(${x}, ${y}) rotate(${rotation}, 10, 10)`}
      className="cursor-pointer group"
      onClick={() => onSelect()}
      style={{ cursor: "pointer" }}
    >
      <path
        d="M4,16 L4,10 Q4,4 10,4 Q16,4 16,10 L16,16 Q10,18 4,16 Z"
        fill={colors.fill}
        stroke={colors.stroke}
        strokeWidth={colors.strokeWidth || 0.5}
        className={`transition-all duration-300 group-hover:brightness-90 ${
          isSearched ? "animate-pulse" : ""
        }`}
        style={{ cursor: "pointer" }}
      />
      <text
        x="10"
        y="13"
        textAnchor="middle"
        className="text-[6px] font-bold pointer-events-none"
        fill={isSelected ? "#fff" : colors.text || "#374151"}
      >
        {id}
      </text>
    </g>
  );
};

const TableIcon = ({ type, x, y, width, height, label }) => (
  <g transform={`translate(${x}, ${y})`}>
    {type === "round" ? (
      <circle
        cx={width / 2}
        cy={height / 2}
        r={width / 2}
        fill="#f8fafc"
        stroke="#e2e8f0"
        strokeWidth="1.5"
      />
    ) : (
      <rect
        width={width}
        height={height}
        rx="6"
        fill="#f8fafc"
        stroke="#e2e8f0"
        strokeWidth="1.5"
      />
    )}
    <text
      x={width / 2}
      y={height / 2 + 4}
      textAnchor="middle"
      className="text-[7px] font-serif fill-stone-500 font-bold uppercase tracking-widest"
    >
      {label}
    </text>
  </g>
);

// --- MAIN APP COMPONENT ---

const App = () => {
  // --- STATE (FROM CODE 1) ---
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);
  const [selectedDate, setSelectedDate] = useState("Today");
  const [selectedTime, setSelectedTime] = useState("12:00 PM");
  const [me, setMe] = useState(null);

  // --- API & LOGIC (FROM CODE 1) ---
  
  // Axios instance (cookie-based auth)
  const api = axios.create({
    baseURL: "http://127.0.0.1:8000",
    withCredentials: true,
  });

  // Fetch Current User
  useEffect(() => {
    api
      .get("/me")
      .then((res) => setMe(res.data))
      .catch(() => setMe(null));
  }, []);

  // Fetch seats periodically
  useEffect(() => {
    fetchSeats();
    const interval = setInterval(fetchSeats, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchSeats = async () => {
    try {
      const res = await api.get("/seats");
      const normalizedSeats = res.data.map((seat) => ({
        ...seat,
        id: seat.id || seat._id,
      }));
      setSeats(normalizedSeats);
      if (selectedSeat) {
        const updatedSeat = normalizedSeats.find(
          (s) => s.id === selectedSeat.id
        );
        if (updatedSeat) setSelectedSeat(updatedSeat);
      }
    } catch (err) {
      console.error(err);
      setNotification({ type: "error", message: "Failed to fetch seats" });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  // Booking Logic
  const handleBooking = async () => {
    if (!selectedSeat) return;
    try {
      await api.post("/book", {
        seat_id: selectedSeat.id,
        name: "Employee",
        date: selectedDate,
        time_slot: selectedTime,
      });
      setNotification({
        type: "success",
        message: `Seat ${selectedSeat.id} Reserved`,
      });
      fetchSeats();
    } catch {
      setNotification({ type: "error", message: "Booking Failed" });
    }
    setTimeout(() => setNotification(null), 4000);
  };

  // Checkout Logic
  const handleCheckout = async () => {
    if (!selectedSeat) return;
    try {
      await api.post(`/release/${selectedSeat.id}`);
      setNotification({
        type: "success",
        message: `Checked out of Seat ${selectedSeat.id}`,
      });
      fetchSeats();
    } catch {
      setNotification({ type: "error", message: "Checkout Failed" });
    }
    setTimeout(() => setNotification(null), 3000);
  };

  // Auto-select logic
  const autoSelectSeat = () => {
    const availableSeats = seats.filter((s) => s.status === "available");
    if (!availableSeats.length) {
      setNotification({ type: "error", message: "No seats available!" });
      return;
    }
    const pick =
      availableSeats[Math.floor(Math.random() * availableSeats.length)];
    setSelectedSeat(pick);
    setNotification({
      type: "success",
      message: `AI selected Seat #${pick.id}`,
    });
  };

  // Search Helper
  const isSearched = (seat) => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    return (
      seat.user_details?.full_name?.toLowerCase().includes(q) ||
      seat.booked_by?.toLowerCase().includes(q)
    );
  };

  // Time left Helper
  const getTimeLeft = (bookingTimeStr) => {
    if (!bookingTimeStr) return "45m 00s";
    const bookedAt = new Date(bookingTimeStr).getTime();
    const expiresAt = bookedAt + 45 * 60 * 1000;
    const diff = expiresAt - Date.now();
    if (diff <= 0) return "Expiring...";
    return `${Math.floor(diff / 60000)}m left`;
  };

  // --- MAP RENDERING LOGIC (FROM CODE 2) ---
  const renderArchitecturalMap = () => {
    const nodes = [];
    
    // Helper to generate seat circles/rows
    const createSeats = (startX, startY, count, radius, startId, isRect = false) => {
      const group = [];
      for (let i = 0; i < count; i++) {
        const id = startId + i;
        const seatData = seats.find((s) => s.id === id);
        
        // Skip rendering if seat data hasn't loaded or exceeds count
        if (!seatData && seats.length > 0) continue; 
        
        // If seat data isn't loaded yet, create a mock object for layout preventing crash
        const currentSeat = seatData || { id: id, status: 'unknown' };

        let sx, sy, rot;
        if (isRect) {
          const rowSize = Math.ceil(count / 2);
          const isTopRow = i < rowSize;
          const colIndex = i % rowSize;
          sx = startX + colIndex * 26;
          sy = isTopRow ? startY - 32 : startY + 58;
          rot = isTopRow ? 0 : 180;
        } else {
          const angle = (i * 360) / count * (Math.PI / 180);
          sx = startX + Math.cos(angle) * radius - 10;
          sy = startY + Math.sin(angle) * radius - 10;
          rot = (i * 360) / count + 90;
        }
        
        group.push(
          <ChairIcon
            key={id}
            id={id}
            x={sx}
            y={sy}
            rotation={rot}
            status={currentSeat.status}
            isSelected={selectedSeat?.id === id}
            isSearched={isSearched(currentSeat)}
            onSelect={() => setSelectedSeat(currentSeat)}
          />
        );
      }
      return group;
    };

    // Row 1 (Y=60): 4 Cafe Round Tables - Seats 1-16
    [[80, 60], [200, 60], [320, 60], [440, 60]].forEach(([x, y], i) => {
      nodes.push(<TableIcon key={`cafe1-${i}`} type="round" x={x - 18} y={y - 18} width={36} height={36} label="TABLE" />);
      nodes.push(createSeats(x, y, 4, 32, i * 4 + 1));
    });

    // Row 2 (Y=140): 4 Cafe Round Tables - Seats 17-32
    [[80, 140], [200, 140], [320, 140], [440, 140]].forEach(([x, y], i) => {
      nodes.push(<TableIcon key={`cafe2-${i}`} type="round" x={x - 18} y={y - 18} width={36} height={36} label="TABLE" />);
      nodes.push(createSeats(x, y, 4, 32, i * 4 + 17));
    });

    // Row 3 (Y=230): 3 Team Rect Tables - Seats 33-50
    [[80, 210], [230, 210], [380, 210]].forEach(([x, y], i) => {
      const seatsPerTable = [6, 6, 5][i];
      nodes.push(<TableIcon key={`team1-${i}`} type="rect" x={x - 5} y={y} width={65} height={42} label="TABLE" />);
      nodes.push(createSeats(x + 2, y + 5, seatsPerTable, 0, 33 + i * 6, true));
    });

    // Row 4 (Y=330): 2 Team Rect Tables - Seats 51-62
    [[80, 340], [280, 340]].forEach(([x, y], i) => {
      nodes.push(<TableIcon key={`team2-${i}`} type="rect" x={x - 5} y={y} width={75} height={48} label="TABLE" />);
      nodes.push(createSeats(x + 2, y + 5, 6, 0, 51 + i * 6, true));
    });

    // Row 5 (Y=450): 2 Collab Tables - Seats 63-76
    [[60, 460], [300, 460]].forEach(([x, y], i) => {
      nodes.push(<TableIcon key={`collab1-${i}`} type="rect" x={x - 8} y={y} width={95} height={52} label="TABLE" />);
      nodes.push(createSeats(x, y + 8, 7, 0, 63 + i * 7, true));
    });

    return nodes;
  };

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-sans p-4 md:p-8">
      <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* --- HEADER --- */}
        <div className="lg:col-span-12">
          <div className="flex justify-between items-end border-b-2 border-stone-200 pb-6">
            <div>
              <h1 className="text-4xl font-serif font-bold text-[#4A403A]">
                Blu-Reserve
              </h1>
              <div className="flex items-center gap-4 mt-2">
                <span className="bg-[#4A403A] text-white text-xs font-bold px-2 py-1 rounded">
                  BLU DOLLAR ENABLED
                </span>
                <p className="text-stone-400 text-sm font-medium">
                  North Wing • Floor 3
                </p>
              </div>
            </div>
            
            {/* Search & Filters */}
            <div className="flex flex-col items-end gap-3">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for a colleague..."
                  className="pl-9 pr-4 py-2 rounded-full border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-[#4A403A] outline-none w-64 shadow-sm"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <svg
                  className="absolute left-3 top-2.5 text-stone-400"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </div>
              <div className="flex gap-4">
                <div className="bg-white p-1 rounded-lg border border-stone-200 shadow-sm flex">
                  {["Today", "Tomorrow", "Day After"].map((date) => (
                    <button
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`px-4 py-2 rounded-md text-xs font-bold transition-all ${
                        selectedDate === date
                          ? "bg-[#4A403A] text-white shadow-md"
                          : "text-stone-500 hover:bg-stone-100"
                      }`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
                <div className="bg-white p-1 rounded-lg border border-stone-200 shadow-sm flex">
                  {["12:00 PM", "12:30 PM", "1:00 PM", "1:30 PM"].map((time) => (
                    <button
                      key={time}
                      onClick={() => setSelectedTime(time)}
                      className={`px-3 py-2 rounded-md text-xs font-bold transition-all ${
                        selectedTime === time
                          ? "bg-blue-600 text-white shadow-md"
                          : "text-stone-500 hover:bg-stone-100"
                      }`}
                    >
                      {time}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* --- MAP SECTION --- */}
        <div className="lg:col-span-9 bg-white rounded-3xl shadow-xl border border-stone-200 p-8 relative overflow-hidden">
          <button
            onClick={autoSelectSeat}
            className="absolute top-6 right-6 bg-[#4A403A] text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#38302C] transition-all shadow-lg flex items-center gap-2 z-30"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"></path>
            </svg>
            Smart Assign
          </button>
          
          <div className="mb-10">
            <h2 className="text-xl font-bold text-stone-700 font-serif">
              Seat Selection
            </h2>
            <p className="text-stone-400 text-sm">
              Showing availability for{" "}
              <span className="font-bold text-[#4A403A]">{selectedDate}</span>{" "}
              at <span className="font-bold text-blue-600">{selectedTime}</span>
            </p>
          </div>
          
          <div className="relative bg-stone-50 rounded-[2rem] border-2 border-stone-200 p-16 h-auto min-h-[800px] shadow-inner">
            <div className="absolute bottom-0 right-0 transform -translate-x-1/2 translate-y-1/2 bg-white px-6 py-2 border-2 border-stone-200 rounded-lg shadow-md z-20 text-xs font-bold tracking-widest text-stone-400">
              MAIN ENTRANCE
            </div>
            
            <FoodStall position="top-0 left-1/2 transform -translate-x-1/2 -mt-6" name="The Roastery" emoji="☕️" color="bg-blue-100" desc="Cafe & Bakery" />
            <FoodStall position="top-1/2 right-0 transform translate-x-1/2 -translate-y-1/2" name="Fire & Slice" emoji="🍕" color="bg-red-100" desc="Woodfired Pizza" />
            <FoodStall position="top-1/2 left-0 transform -translate-x-1/2 -translate-y-1/2" name="Spice Route" emoji="🍜" color="bg-orange-100" desc="Asian Fusion" />
            <FoodStall position="bottom-0 left-1/2 transform -translate-x-1/2 translate-y-6" name="Green Leaf" emoji="🥗" color="bg-green-100" desc="Salad Bar" />
            
            <svg
              viewBox="0 0 550 600"
              className="w-full h-full absolute inset-0 z-10"
              style={{ pointerEvents: "auto" }}
            >
              {renderArchitecturalMap()}
            </svg>
          </div>
        </div>

        {/* --- RIGHT PANEL (BOOKING SUMMARY) --- */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-3xl border border-stone-200 p-6 sticky top-8 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-serif font-bold text-[#4A403A]">
                Booking Summary
              </h2>
              <div
                className={`w-2 h-2 rounded-full ${
                  selectedSeat?.status === "occupied"
                    ? "bg-red-500"
                    : "bg-green-500"
                }`}
              ></div>
            </div>

            {selectedSeat ? (
              <div className="space-y-6">
                <div className="bg-stone-50 p-4 rounded-2xl border border-stone-100 text-center">
                  <p className="text-xs text-stone-400 uppercase tracking-widest mb-1">
                    Seat Number
                  </p>
                  <p className="text-5xl font-serif font-bold text-[#4A403A]">
                    {selectedSeat.id}
                  </p>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between text-sm border-b border-stone-100 pb-2">
                    <span className="text-stone-500">Date</span>
                    <span className="font-bold text-[#4A403A]">
                      {selectedDate}
                    </span>
                  </div>

                  {/* Show Time Left only if occupied */}
                  {selectedSeat.status === "occupied" && (
                    <div className="flex justify-between text-sm border-b border-stone-100 pb-2">
                      <span className="text-stone-500">Auto-Checkout In</span>
                      <span className="font-mono font-bold text-red-500">
                        {getTimeLeft(selectedSeat.booking_time)}
                      </span>
                    </div>
                  )}

                  <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 mt-2">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-blue-800 font-bold">Cost</span>
                      <span className="text-blue-800 font-bold">5.00 BD</span>
                    </div>
                    <p className="text-[10px] text-blue-400">
                      Billable to: Manager's Cost Center
                    </p>
                  </div>
                </div>

                {/* --- ACTION BUTTONS (LOGIC FROM CODE 1) --- */}
                {selectedSeat.status === "available" && (
                  <button
                    onClick={handleBooking}
                    className="w-full bg-[#4A403A] text-white py-4 rounded-xl font-bold hover:bg-[#2C2826] hover:shadow-lg transition-all transform active:scale-95"
                  >
                    Confirm & Charge Manager
                  </button>
                )}

                {/* Only allow release if the current user booked it */}
                {selectedSeat.status === "occupied" &&
                  selectedSeat.booked_by === me?.w3_id && (
                    <button
                      onClick={handleCheckout}
                      className="w-full bg-red-500 text-white py-4 rounded-xl font-bold hover:bg-red-600 transition-all transform active:scale-95"
                    >
                      Release Seat
                    </button>
                  )}

                {/* Show message if booked by someone else */}
                {selectedSeat.status === "occupied" &&
                  selectedSeat.booked_by !== me?.w3_id && (
                    <div className="text-center py-4 bg-stone-100 rounded-xl">
                      <p className="text-stone-500 text-sm font-medium italic">
                        Reserved by another colleague
                      </p>
                    </div>
                  )}
              </div>
            ) : (
              <div className="text-center py-12 text-stone-400 border-2 border-dashed border-stone-100 rounded-2xl">
                <p className="text-sm italic">"Select a seat."</p>
              </div>
            )}
          </div>
        </div>

        {/* --- NOTIFICATION --- */}
        {notification && (
          <div className="fixed bottom-10 left-1/2 transform -translate-x-1/2 px-8 py-4 bg-[#2C2826] text-white rounded-full shadow-2xl z-50 font-bold tracking-wide animate-bounce">
            {notification.message}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
