import React, { useState, useEffect } from "react";
import axios from "axios";

const App = () => {
  const [seats, setSeats] = useState([]);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [notification, setNotification] = useState(null);
  const [selectedDate, setSelectedDate] = useState("Today");
  const [selectedTime, setSelectedTime] = useState("12:00 PM");

  // --- Axios instance (cookie-based auth) ---
  const api = axios.create({
    baseURL: "http://127.0.0.1:8000",
    withCredentials: true,
  });

  // --- Fetch seats periodically ---
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

  // --- Booking ---
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

  // --- Checkout ---
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

  // --- Auto-select seat ---
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

  // --- Search helper ---
  const isSearched = (seat) => {
    if (!searchQuery) return false;
    const q = searchQuery.toLowerCase();
    return (
      seat.user_details?.full_name?.toLowerCase().includes(q) ||
      seat.booked_by?.toLowerCase().includes(q)
    );
  };

  // --- Time left helper ---
  const getTimeLeft = (bookingTimeStr) => {
    if (!bookingTimeStr) return "45m 00s";
    const bookedAt = new Date(bookingTimeStr).getTime();
    const expiresAt = bookedAt + 45 * 60 * 1000;
    const diff = expiresAt - Date.now();
    if (diff <= 0) return "Expiring...";
    return `${Math.floor(diff / 60000)}m left`;
  };

  // --- Zone colors ---
  const getZoneStyle = (id) => {
    if (id <= 25)
      return "border-blue-200 bg-blue-50 text-blue-400 hover:border-blue-500 hover:bg-blue-100";
    if (id <= 50)
      return "border-orange-200 bg-orange-50 text-orange-400 hover:border-orange-500 hover:bg-orange-100";
    if (id <= 75)
      return "border-red-200 bg-red-50 text-red-400 hover:border-red-500 hover:bg-red-100";
    return "border-green-200 bg-green-50 text-green-400 hover:border-green-500 hover:bg-green-100";
  };

  const FoodStall = ({ name, emoji, color, position, desc }) => (
    <div className={`absolute ${position} flex flex-col items-center z-20`}>
      <div
        className={`w-12 h-12 ${color} rounded-full shadow-lg border-4 border-white flex items-center justify-center text-2xl`}
      >
        {emoji}
      </div>
      <div className="bg-white px-3 py-1 rounded-full shadow-md border mt-2 text-center">
        <p className="text-[10px] font-bold uppercase">{name}</p>
        <p className="text-[8px] text-stone-400">{desc}</p>
      </div>
    </div>
  );

  /* =========================
     DASHBOARD UI (ONLY CHANGE)
  ========================= */
  return (
    <div className="min-h-screen bg-stone-100 text-stone-800 font-sans p-4 md:p-8">
    <div className="max-w-7xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

      {/* Header */}
      <div className="lg:col-span-12">
        <div className="flex justify-between items-end border-b-2 border-stone-200 pb-6">
          <div>
            <h1 className="text-4xl font-serif font-bold text-[#4A403A]">
              Blu-Reserve
            </h1>
            <p className="text-stone-400 text-sm font-medium mt-2">
              North Wing • Floor 3
            </p>
          </div>

          <input
            type="text"
            placeholder="Search for a colleague..."
            className="pl-9 pr-4 py-2 rounded-full border border-stone-200 bg-white text-sm focus:ring-2 focus:ring-[#4A403A] outline-none w-64 shadow-sm"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* MAP */}
      <div className="lg:col-span-9 bg-white rounded-3xl shadow-xl border border-stone-200 p-8 relative overflow-hidden">
        <button
          onClick={autoSelectSeat}
          className="absolute top-6 right-6 bg-[#4A403A] text-white px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider hover:bg-[#38302C] transition-all shadow-lg z-30"
        >
          Smart Assign
        </button>

        <div className="relative bg-stone-50 rounded-[2rem] border-2 border-stone-200 p-16 min-h-[700px] shadow-inner">

          {/* Food Stalls */}
          <FoodStall
            position="top-0 left-1/2 -translate-x-1/2 -mt-6"
            name="Cafe"
            emoji="☕"
            color="bg-blue-100"
            desc="Coffee"
          />

          {/* SEAT GRID (still using Code 1 logic) */}
          <div className="grid grid-cols-10 gap-3">
            {seats.map((seat) => (
              <button
                key={seat.id}
                onClick={() => setSelectedSeat(seat)}
                className={`
                  aspect-square rounded-lg text-xs font-bold border transition-all
                  ${isSearched(seat) ? "bg-yellow-400 scale-125 z-50" : ""}
                  ${
                    seat.status === "occupied"
                      ? "bg-stone-300 text-stone-400"
                      : getZoneStyle(seat.id)
                  }
                  ${
                    selectedSeat?.id === seat.id
                      ? "ring-4 ring-[#4A403A]"
                      : ""
                  }
                `}
              >
                {seat.id}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* RIGHT PANEL */}
      <div className="lg:col-span-3">
        <div className="bg-white rounded-3xl border border-stone-200 p-6 sticky top-8 shadow-xl">
          <h2 className="text-lg font-serif font-bold text-[#4A403A] mb-6">
            Booking Summary
          </h2>

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

              {selectedSeat.status === "occupied" && (
                <p className="text-sm text-red-500 font-mono text-center">
                  Auto-checkout in {getTimeLeft(selectedSeat.booking_time)}
                </p>
              )}

              {selectedSeat.status === "available" ? (
                <button
                  onClick={handleBooking}
                  className="w-full bg-[#4A403A] text-white py-4 rounded-xl font-bold hover:bg-[#2C2826] transition-all"
                >
                  Confirm Booking
                </button>
              ) : (
                <button
                  onClick={handleCheckout}
                  className="w-full bg-red-500 text-white py-4 rounded-xl font-bold hover:bg-red-600 transition-all"
                >
                  Release Seat
                </button>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-stone-400 border-2 border-dashed border-stone-100 rounded-2xl">
              <p className="text-sm italic">Select a seat</p>
            </div>
          )}
        </div>
      </div>
    </div>

    {notification && (
      <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-[#2C2826] text-white px-8 py-4 rounded-full shadow-2xl z-50 font-bold">
        {notification.message}
      </div>
    )}
  </div>
);

         
         
           
};

export default App;
