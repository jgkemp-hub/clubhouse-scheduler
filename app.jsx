import React, { useState, useEffect, useRef } from 'react';
import { Plus, Calendar, User, Phone, Clock, Trash2, Edit, X, Download, Users, Beer, Bell, List, LayoutGrid, AlertTriangle, FileText, RefreshCw, ChevronLeft, ChevronRight, Building, MessageSquare } from 'lucide-react';

// --- IMPORTANT: Google API Configuration ---
// Instructions:
// 1. Go to https://console.cloud.google.com/
// 2. Create a new project.
// 3. Enable the "Google Sheets API".
// 4. Go to "Credentials", create an "API key" and paste it below.
// 5. Create "OAuth 2.0 Client ID", select "Web application", add your app's final URL (e.g., from Netlify)
//    to "Authorized JavaScript origins", and paste the Client ID below.
const GOOGLE_API_KEY = 'AIzaSyD8nxFQdu0QkB1K62OMOJ87EY4_wLFsRJw'; // <-- REPLACE WITH YOUR API KEY
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com'; // <-- REPLACE WITH YOUR CLIENT ID

const DISCOVERY_DOCS = ["https://sheets.googleapis.com/$discovery/rest?version=v4"];
const SCOPES = "https://www.googleapis.com/auth/spreadsheets";


// Helper function to format date for input[type=date]
const formatDateForInput = (date) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to format time for display
const formatTimeForDisplay = (time) => {
    if (!time) return 'N/A';
    const [hours, minutes] = time.split(':');
    const hoursNum = parseInt(hours, 10);
    const ampm = hoursNum >= 12 ? 'PM' : 'AM';
    const formattedHours = hoursNum % 12 || 12;
    return `${formattedHours}:${minutes} ${ampm}`;
}

const App = () => {
  const [staff, setStaff] = useState(() => {
    try {
      const savedStaff = localStorage.getItem('barScheduleStaff');
      return savedStaff ? JSON.parse(savedStaff) : [
        { id: 1, firstName: 'Alice', lastName: 'Johnson', email: 'alice@example.com', phone: '555-0101', positions: ['bartender'], role: 'manager' },
        { id: 2, firstName: 'Bob', lastName: 'Williams', email: 'bob@example.com', phone: '555-0102', positions: ['bartender', 'bar back'], role: 'user' },
        { id: 3, firstName: 'Charlie', lastName: 'Brown', email: 'charlie@example.com', phone: '555-0103', positions: ['bartender'], role: 'user' },
        { id: 7, firstName: 'George', lastName: 'Rodriguez', email: 'george@example.com', phone: '555-0107', positions: ['bar back'], role: 'user' },
      ];
    } catch (error) {
      console.error("Could not parse staff from localStorage:", error);
      return [];
    }
  });

  const [events, setEvents] = useState(() => {
    try {
      const savedEvents = localStorage.getItem('barScheduleEvents');
      return savedEvents ? JSON.parse(savedEvents) : [];
    } catch (error) {
      console.error("Could not parse events from localStorage:", error);
      return [];
    }
  });
  
  const [mainView, setMainView] = useState('schedule'); // 'schedule' or 'staff'
  const [scheduleView, setScheduleView] = useState('card'); // 'card', 'list', or 'calendar'

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState(null);
  
  const [currentUser, setCurrentUser] = useState(staff[0] || null); 
  const [notification, setNotification] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); 
  const [shiftWarning, setShiftWarning] = useState(null); 
  const [staffFilter, setStaffFilter] = useState('all');
  
  // Disable login flow for now
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [loginError, setLoginError] = useState('');
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);


  // State for Google Sheets Integration
  const [gapiLoaded, setGapiLoaded] = useState(false);
  const [googleAuth, setGoogleAuth] = useState(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [spreadsheetId, setSpreadsheetId] = useState(() => localStorage.getItem('spreadsheetId') || '');
  const [isApiConfigured, setIsApiConfigured] = useState(true);

  const currentUserRole = currentUser?.role || 'user';

  // --- Data Persistence Effects ---
  useEffect(() => {
    try {
      localStorage.setItem('barScheduleEvents', JSON.stringify(events));
    } catch (error) {
      console.error("Could not save events to localStorage:", error);
    }
  }, [events]);

  useEffect(() => {
    try {
      localStorage.setItem('barScheduleStaff', JSON.stringify(staff));
    } catch (error) {
      console.error("Could not save staff to localStorage:", error);
    }
  }, [staff]);
  
  // Effect to load Google API Client
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.onload = () => {
      window.gapi.load('client:auth2', initClient);
    };
    document.body.appendChild(script);
  }, []);

  const initClient = () => {
    if (GOOGLE_API_KEY === 'YOUR_GOOGLE_API_KEY' || GOOGLE_CLIENT_ID === 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com') {
      setIsApiConfigured(false);
      return;
    }

    window.gapi.client.init({
      apiKey: GOOGLE_API_KEY,
      clientId: GOOGLE_CLIENT_ID,
      discoveryDocs: DISCOVERY_DOCS,
      scope: SCOPES,
    }).then(() => {
      const auth = window.gapi.auth2.getAuthInstance();
      setGoogleAuth(auth);
      setGapiLoaded(true);
      const signedIn = auth.isSignedIn.get();
      setIsSignedIn(signedIn);
      auth.isSignedIn.listen(setIsSignedIn);
    }).catch(error => {
      console.error("Error initializing Google API client:", error);
      setNotification("Error initializing Google Sync.");
      setTimeout(() => setNotification(null), 3000);
    });
  };

  const handleLogin = (email, password) => {
    const user = staff.find(s => s.email === email);
    if (user) {
      // In a real app, you would verify the password here.
      // For this simulation, we'll just log them in.
      setCurrentUser(user);
      setIsLoggedIn(true);
      setLoginError('');
    } else {
      setLoginError('Invalid email or password.');
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser(null);
  };
  
  // --- Modal Handlers ---
  const openEventModal = (event = null) => {
    setCurrentEvent(event);
    setIsEventModalOpen(true);
  };

  const closeEventModal = () => {
    setIsEventModalOpen(false);
    setCurrentEvent(null);
  };
  
  const openStaffModal = (staffMember = null) => {
    setCurrentStaff(staffMember);
    setIsStaffModalOpen(true);
  }

  const closeStaffModal = () => {
    setIsStaffModalOpen(false);
    setCurrentStaff(null);
  }

  // --- CRUD Handlers ---
  const handleSaveStaff = (staffData) => {
    if (staffData.id) {
      setStaff(staff.map(s => s.id === staffData.id ? staffData : s));
    } else {
      setStaff([...staff, { ...staffData, id: Date.now() }]);
    }
    closeStaffModal();
  }

  const handleDeleteStaff = (staffId) => {
    // Also remove staff from any events
    setEvents(events.map(event => ({
      ...event,
      bartenders: event.bartenders.filter(id => id !== staffId),
      barBacks: event.barBacks.filter(id => id !== staffId)
    })));
    setStaff(staff.filter(s => s.id !== staffId));
    // If deleting self, reset current user
    if (currentUser?.id === staffId) {
      setCurrentUser(staff[0] || null);
    }
  }
  
  const executeSaveEvent = (eventData) => {
    if (eventData.id) {
        setEvents(events.map(e => e.id === eventData.id ? eventData : e));
    } else {
        setEvents([...events, { ...eventData, id: Date.now() }]);
    }
  }

  const handleSaveEvent = (eventData) => {
    const { startTime, endTime } = eventData;
    const start = new Date(`1970-01-01T${startTime}`);
    const end = new Date(`1970-01-01T${endTime}`);
    
    let durationHours = (end - start) / (1000 * 60 * 60);
    if (durationHours < 0) { // Handles overnight shifts
        durationHours += 24;
    }

    if (durationHours > 5) {
        setShiftWarning({ eventData, duration: durationHours.toFixed(1) });
    } else {
        executeSaveEvent(eventData);
        closeEventModal();
    }
  };

  const handleConfirmShiftWarning = () => {
    if (shiftWarning) {
        executeSaveEvent(shiftWarning.eventData);
        setShiftWarning(null);
        closeEventModal();
    }
  };

  const handleDeleteEvent = (eventId) => {
    setConfirmDelete({id: eventId, type: 'event'});
  };

  const executeDelete = () => {
    if (confirmDelete?.type === 'event') {
        setEvents(events.filter(e => e.id !== confirmDelete.id));
    } else if (confirmDelete?.type === 'staff') {
        handleDeleteStaff(confirmDelete.id);
    }
    setConfirmDelete(null);
  };

  const sortedEvents = [...events].sort((a, b) => new Date(a.date) - new Date(b.date));

  const filteredEvents = sortedEvents.filter(event => {
    if (staffFilter === 'all') {
        return true;
    }
    const staffId = Number(staffFilter);
    return event.bartenders.includes(staffId) || event.barBacks.includes(staffId);
  });
    
  // --- Export & Sync Functions ---
  const generateICS = (event, userId) => {
    const isBartender = event.bartenders.includes(userId);
    const isBarBack = event.barBacks.includes(userId);

    if (!isBartender && !isBarBack) {
        setNotification('You are not assigned to this shift. Cannot sync to calendar.');
        setTimeout(() => setNotification(null), 3000);
        return;
    }
    
    const assignedRole = isBartender ? 'Bartender' : 'Bar Back';
    const startDate = new Date(`${event.date}T${event.startTime}`);
    const endDate = new Date(`${event.date}T${event.endTime}`);

    if (endDate < startDate) {
      endDate.setDate(endDate.getDate() + 1);
    }
    
    const toUTC = (date) => new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().replace(/[:-]/g, '').split('.')[0] + 'Z';

    let description = `Event Contact: ${event.contactName} (${event.contactPhone}). Your assigned role: ${assignedRole}.`;
    if (event.eventNotes) description += `\\n\\nEvent Notes: ${event.eventNotes}`;
    if (event.barTrusteeNotes) description += `\\n\\nBar Trustee Notes: ${event.barTrusteeNotes}`;
    if (event.barSchedulerNotes) description += `\\n\\nBar Scheduler Notes: ${event.barSchedulerNotes}`;

    description = description.replace(/\n/g, '\\n'); // Ensure newlines are escaped for ICS format

    const icsContent = `BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//Clubhouse Bar//Shift Scheduler//EN\nBEGIN:VEVENT\nUID:${event.id}@clubhouse.bar\nDTSTAMP:${toUTC(new Date())}\nDTSTART:${toUTC(startDate)}\nDTEND:${toUTC(endDate)}\nSUMMARY:Bar Shift: ${event.name}\nDESCRIPTION:${description}\nLOCATION:Community Clubhouse Bar\nEND:VEVENT\nEND:VCALENDAR`.trim().replace(/\n/g, '\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${event.name.replace(/\s+/g, '_')}_shift.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportToCSV = (eventsToExport) => {
    const headers = ["Event Name", "Event Type", "Date", "Start Time", "End Time", "Contact Name", "Contact Phone", "Bartenders", "Bar Backs", "Event Notes", "Bar Trustee Notes", "Bar Scheduler Notes"];
    const rows = eventsToExport.map(event => {
      const getStaffNames = (ids) => ids.map(id => {
        const s = staff.find(st => st.id === id);
        return s ? `${s.firstName} ${s.lastName}` : '';
      }).join('; ');

      const bartenders = getStaffNames(event.bartenders);
      const barBacks = getStaffNames(event.barBacks);

      return [`"${event.name.replace(/"/g, '""')}"`, event.eventType, new Date(event.date).toLocaleDateString('en-US'), formatTimeForDisplay(event.startTime), formatTimeForDisplay(event.endTime), `"${event.contactName.replace(/"/g, '""')}"`, event.contactPhone, `"${bartenders}"`, `"${barBacks}"`, `"${(event.eventNotes || '').replace(/"/g, '""')}"`, `"${(event.barTrusteeNotes || '').replace(/"/g, '""')}"`, `"${(event.barSchedulerNotes || '').replace(/"/g, '""')}"`].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "clubhouse_bar_schedule.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  
  const handleGoogleSignIn = () => googleAuth?.signIn();
  const handleGoogleSignOut = () => googleAuth?.signOut();

  const handleSyncToSheet = () => {
    let currentSheetId = spreadsheetId;
    if (!currentSheetId) {
      currentSheetId = prompt("Please enter your Google Sheet ID:", "");
      if (currentSheetId) {
        setSpreadsheetId(currentSheetId);
        localStorage.setItem('spreadsheetId', currentSheetId);
      } else return;
    }
    
    setIsSyncing(true);
    const headers = ["Event Name", "Event Type", "Date", "Start Time", "End Time", "Contact Name", "Contact Phone", "Bartenders", "Bar Backs", "Event Notes", "Bar Trustee Notes", "Bar Scheduler Notes"];
    const rows = filteredEvents.map(event => {
      const getStaffNames = (ids) => ids.map(id => {
        const s = staff.find(st => st.id === id);
        return s ? `${s.firstName} ${s.lastName}` : '';
      }).join(', ');
      return [event.name, event.eventType, new Date(event.date).toLocaleDateString('en-US'), formatTimeForDisplay(event.startTime), formatTimeForDisplay(event.endTime), event.contactName, event.contactPhone, getStaffNames(event.bartenders), getStaffNames(event.barBacks), event.eventNotes || '', event.barTrusteeNotes || '', event.barSchedulerNotes || ''];
    });

    window.gapi.client.sheets.spreadsheets.values.update({
      spreadsheetId: currentSheetId,
      range: 'Sheet1!A1',
      valueInputOption: 'USER_ENTERED',
      resource: { values: [headers, ...rows] },
    }).then(() => {
      setNotification('Successfully synced to Google Sheet!');
      setTimeout(() => setNotification(null), 3000);
    }).catch(err => {
      const errorMsg = err.result?.error?.message || 'Error syncing. Check Sheet ID and permissions.';
      setNotification(errorMsg);
      setTimeout(() => setNotification(null), 5000);
    }).finally(() => setIsSyncing(false));
  };
  
  if (!isLoggedIn) {
    return (
      <div className="bg-gray-100 min-h-screen flex items-center justify-center">
        <LoginScreen onLogin={handleLogin} error={loginError} onForgotPassword={() => setIsForgotPasswordOpen(true)} />
        {isForgotPasswordOpen && <ForgotPasswordModal onClose={() => setIsForgotPasswordOpen(false)} />}
      </div>
    )
  }

  return (
    <div className="bg-gray-100 min-h-screen font-sans text-gray-800 relative">
      <div className="container mx-auto p-4 md:p-8">
        <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
            <div className="text-center md:text-left">
                <h1 className="text-4xl font-bold text-gray-700 tracking-tight">Clubhouse Bar Scheduler</h1>
                <div className="flex items-center gap-6 mt-2">
                    {currentUser && (
                      <div className="flex items-center gap-4">
                          <span className="text-sm">Welcome, <strong className="font-semibold">{currentUser.firstName} {currentUser.lastName}</strong></span>
                          <span className="text-sm"><span className="font-medium text-gray-600">Role:</span> <span className="font-bold capitalize">{currentUserRole}</span></span>
                          <button onClick={handleLogout} className="text-sm text-blue-600 hover:underline">Logout</button>
                      </div>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={() => setMainView('schedule')} className={`px-4 py-2 rounded-lg font-semibold transition ${mainView === 'schedule' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-200'}`}>Schedule</button>
                <button onClick={() => setMainView('staff')} className={`px-4 py-2 rounded-lg font-semibold transition ${mainView === 'staff' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-200'}`}>Staff</button>
            </div>
        </header>

        {!isApiConfigured && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6 rounded-r-lg" role="alert">
            <p className="font-bold">Configuration Required</p>
            <p>The Google Sheets Sync feature is disabled. To enable it, you must add your own Google API Key and Client ID to the top of the <strong>App.jsx</strong> file.</p>
          </div>
        )}

        {mainView === 'schedule' && (
          <>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg shadow">
                <div className="flex items-center gap-4">
                    <label htmlFor="staff-filter" className="text-sm font-medium text-gray-600 whitespace-nowrap">Filter by Staff:</label>
                    <select id="staff-filter" value={staffFilter} onChange={(e) => setStaffFilter(e.target.value)} className="p-2 border border-gray-300 rounded-md shadow-sm">
                        <option value="all">All Staff</option>
                        {staff.map(person => ( <option key={person.id} value={person.id}>{person.firstName} {person.lastName}</option> ))}
                    </select>
                </div>
                <div className="flex items-center flex-wrap justify-center gap-4">
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-600">View:</span>
                        <button onClick={() => setScheduleView('card')} className={`p-2 rounded-md transition ${scheduleView === 'card' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}><LayoutGrid size={20} /></button>
                        <button onClick={() => setScheduleView('list')} className={`p-2 rounded-md transition ${scheduleView === 'list' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}><List size={20} /></button>
                        <button onClick={() => setScheduleView('calendar')} className={`p-2 rounded-md transition ${scheduleView === 'calendar' ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300'}`}><Calendar size={20} /></button>
                    </div>
                </div>
            </div>
            <div className="mb-6 flex flex-col sm:flex-row justify-between items-center gap-4 p-4 bg-white rounded-lg shadow">
                 <div className="flex items-center flex-wrap justify-center gap-4">
                    <button onClick={() => exportToCSV(filteredEvents)} className="flex items-center gap-2 p-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition text-sm font-medium"><FileText size={18} />Export to CSV</button>
                    {isApiConfigured && !isSignedIn && gapiLoaded && ( 
                      <button onClick={handleGoogleSignIn} className="flex items-center gap-2 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm font-medium">
                        <svg className="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></svg>
                        Sign in with Google
                      </button> 
                    )}
                    {isApiConfigured && isSignedIn && ( 
                      <div className="flex items-center gap-2">
                        <button onClick={handleSyncToSheet} disabled={isSyncing} className="flex items-center gap-2 p-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition text-sm font-medium disabled:bg-gray-400">{isSyncing ? <RefreshCw size={18} className="animate-spin" /> : <FileText size={18} />}{isSyncing ? 'Syncing...' : 'Sync to Sheet'}</button>
                        <button onClick={handleGoogleSignOut} className="p-2 bg-gray-200 text-gray-700 text-sm rounded-md hover:bg-gray-300">Sign out</button>
                      </div> 
                    )}
                </div>
                 {currentUserRole === 'manager' && ( <button onClick={() => openEventModal()} className="flex items-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition transform hover:scale-105"><Plus size={20} className="mr-2" />Create New Event</button> )}
            </div>
          </>
        )}
        
        <main>
            {mainView === 'schedule' ? (
                filteredEvents.length > 0 ? (
                    scheduleView === 'card' ? ( <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">{filteredEvents.map(event => ( <EventCard key={event.id} event={event} onEdit={openEventModal} onDelete={handleDeleteEvent} onSync={generateICS} currentUser={currentUser} currentUserRole={currentUserRole} staffList={staff} /> ))}</div> ) 
                    : scheduleView === 'list' ? ( <ListView events={filteredEvents} onEdit={openEventModal} onDelete={handleDeleteEvent} onSync={generateICS} currentUser={currentUser} currentUserRole={currentUserRole} staffList={staff}/> )
                    : ( <CalendarView events={filteredEvents} onEventClick={openEventModal} staffList={staff}/> )
                ) : ( <div className="text-center py-16 bg-white rounded-lg shadow-md"><Calendar size={48} className="mx-auto text-gray-400" /><h2 className="mt-4 text-2xl font-semibold text-gray-600">No Events Scheduled</h2><p className="mt-2 text-gray-500">{staffFilter === 'all' ? 'Click "Create New Event" to get started.' : 'No shifts assigned to this staff member.'}</p></div> )
            ) : (
                <StaffManager staff={staff} onAdd={() => openStaffModal()} onEdit={openStaffModal} onDelete={(staffId) => setConfirmDelete({id: staffId, type: 'staff'})} currentUserRole={currentUserRole}/>
            )}
        </main>
      </div>

      {isEventModalOpen && ( <EventModal event={currentEvent} onClose={closeEventModal} onSave={handleSaveEvent} staffList={staff} /> )}
      {isStaffModalOpen && ( <StaffModal staffMember={currentStaff} onClose={closeStaffModal} onSave={handleSaveStaff} /> )}
      {notification && <Notification message={notification} onClose={() => setNotification(null)} />}
      {confirmDelete && ( <ConfirmModal message={`Are you sure you want to delete this ${confirmDelete.type}?`} onConfirm={executeDelete} onCancel={() => setConfirmDelete(null)} /> )}
      {shiftWarning && ( <ShiftWarningModal duration={shiftWarning.duration} onConfirm={handleConfirmShiftWarning} onCancel={() => setShiftWarning(null)} /> )}
    </div>
  );
};

// --- AUTHENTICATION COMPONENTS ---
const LoginScreen = ({ onLogin, error, onForgotPassword }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        onLogin(email, password);
    };

    return (
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-xl">
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800">Clubhouse Scheduler</h1>
                <p className="text-gray-500">Please sign in to continue</p>
            </div>
            <form onSubmit={handleSubmit}>
                <div className="space-y-6">
                    <InputField label="Email Address" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
                    <InputField label="Password" name="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
                    {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                </div>
                <div className="mt-8">
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition">
                        Sign In
                    </button>
                </div>
                <div className="text-center mt-4">
                    <button type="button" onClick={onForgotPassword} className="text-sm text-blue-600 hover:underline">
                        Forgot Password?
                    </button>
                </div>
            </form>
        </div>
    );
};

const ForgotPasswordModal = ({ onClose }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-sm">
            <h2 className="text-2xl font-bold text-center mb-4">Password Reset</h2>
            <p className="text-center text-gray-600">
                For security, password resets must be handled by a manager. Please contact your bar manager to have your password reset.
            </p>
            <div className="mt-6 text-center">
                <button onClick={onClose} className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">
                    OK
                </button>
            </div>
        </div>
    </div>
);


// --- SCHEDULE VIEW COMPONENTS ---

const EventCard = ({ event, onEdit, onDelete, onSync, currentUser, currentUserRole, staffList }) => {
    const getStaffDetails = (ids) => ids.map(id => staffList.find(s => s.id === id)).filter(Boolean);
    const bartenders = getStaffDetails(event.bartenders);
    const barBacks = getStaffDetails(event.barBacks);
    const hasNotes = event.eventNotes || event.barTrusteeNotes || event.barSchedulerNotes;

    return (
        <div className="bg-white rounded-xl shadow-lg overflow-hidden flex flex-col hover:shadow-xl transition-shadow duration-300">
            <div className="bg-gray-800 text-white p-4">
                <div className="flex justify-between items-start">
                    <h3 className="text-xl font-bold truncate pr-2">{event.name}</h3>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${event.eventType === 'paid' ? 'bg-green-200 text-green-800' : 'bg-yellow-200 text-yellow-800'}`}>{event.eventType}</span>
                </div>
                <div className="flex items-center text-gray-300 mt-1"><Calendar size={16} className="mr-2" /><span>{new Date(event.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
            </div>
            <div className="p-5 flex-grow">
                <div className="mb-4"><p className="font-semibold text-gray-700">Shift Time:</p><div className="flex items-center text-gray-600 mt-1"><Clock size={16} className="mr-2" /><span>{formatTimeForDisplay(event.startTime)} - {formatTimeForDisplay(event.endTime)}</span></div></div>
                <div className="space-y-3">
                    <div><p className="font-semibold text-gray-700 flex items-center"><Users size={16} className="mr-2" />Bartenders:</p>{bartenders.length > 0 ? (<div className="flex flex-wrap gap-2 mt-1">{bartenders.map(b => <span key={b.id} className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{b.firstName} {b.lastName}</span>)}</div>) : <p className="text-gray-500 text-sm italic mt-1">None assigned</p>}</div>
                    <div><p className="font-semibold text-gray-700 flex items-center"><Beer size={16} className="mr-2" />Bar Backs:</p>{barBacks.length > 0 ? (<div className="flex flex-wrap gap-2 mt-1">{barBacks.map(b => <span key={b.id} className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded-full">{b.firstName} {b.lastName}</span>)}</div>) : <p className="text-gray-500 text-sm italic mt-1">None assigned</p>}</div>
                </div>
                 {hasNotes && (
                    <div className="mt-4 pt-4 border-t border-gray-200 space-y-2">
                         <p className="font-semibold text-gray-700 flex items-center"><MessageSquare size={16} className="mr-2" />Notes:</p>
                        {event.eventNotes && <p className="text-xs text-gray-600 pl-2 border-l-2 border-gray-300"><strong className="font-semibold">Event:</strong> {event.eventNotes}</p>}
                        {event.barTrusteeNotes && <p className="text-xs text-gray-600 pl-2 border-l-2 border-gray-300"><strong className="font-semibold">Trustee:</strong> {event.barTrusteeNotes}</p>}
                        {event.barSchedulerNotes && <p className="text-xs text-gray-600 pl-2 border-l-2 border-gray-300"><strong className="font-semibold">Scheduler:</strong> {event.barSchedulerNotes}</p>}
                    </div>
                )}
            </div>
            <div className="p-4 bg-gray-50 border-t flex items-center justify-between gap-2">
                <button onClick={() => onSync(event, currentUser.id)} className="flex-1 text-sm flex items-center justify-center gap-2 bg-teal-500 text-white font-semibold py-2 px-3 rounded-md hover:bg-teal-600 transition duration-300"><Download size={16} /> Sync</button>
                {currentUserRole === 'manager' && (<>
                    <button onClick={() => onEdit(event)} className="text-sm p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-200 rounded-md transition duration-300" title="Edit Event"><Edit size={18} /></button>
                    <button onClick={() => onDelete(event.id)} className="text-sm p-2 text-gray-600 hover:text-red-600 hover:bg-gray-200 rounded-md transition duration-300" title="Delete Event"><Trash2 size={18} /></button>
                </>)}
            </div>
        </div>
    );
};

const ListView = ({ events, onEdit, onDelete, onSync, currentUser, currentUserRole, staffList }) => (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm text-left text-gray-600"><thead className="text-xs text-gray-700 uppercase bg-gray-100"><tr><th scope="col" className="px-6 py-3">Event Details</th><th scope="col" className="px-6 py-3">Date & Time</th><th scope="col" className="px-6 py-3">Assigned Staff</th><th scope="col" className="px-6 py-3 text-right">Actions</th></tr></thead><tbody>{events.map(event => (<ListItem key={event.id} event={event} onEdit={onEdit} onDelete={onDelete} onSync={onSync} currentUser={currentUser} currentUserRole={currentUserRole} staffList={staffList}/>))}</tbody></table></div></div>
);

const ListItem = ({ event, onEdit, onDelete, onSync, currentUser, currentUserRole, staffList }) => {
    const getStaffNames = (ids) => ids.map(id => staffList.find(s => s.id === id)).filter(Boolean).map(s => `${s.firstName} ${s.lastName}`).join(', ');
    const bartenders = getStaffNames(event.bartenders);
    const barBacks = getStaffNames(event.barBacks);
    return (
        <tr className="bg-white border-b hover:bg-gray-50">
            <td className="px-6 py-4 align-top"><div className="flex items-center gap-3"><div className="font-bold text-gray-800">{event.name}</div><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${event.eventType === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>{event.eventType}</span></div><div className="text-xs text-gray-500 mt-1">Contact: {event.contactName} ({event.contactPhone})</div>
                <div className="text-xs text-gray-500 mt-2 space-y-1 max-w-xs">
                    {event.eventNotes && <div><strong className="font-semibold">Event Notes:</strong> {event.eventNotes}</div>}
                    {event.barTrusteeNotes && <div><strong className="font-semibold">Trustee Notes:</strong> {event.barTrusteeNotes}</div>}
                    {event.barSchedulerNotes && <div><strong className="font-semibold">Scheduler Notes:</strong> {event.barSchedulerNotes}</div>}
                </div>
            </td>
            <td className="px-6 py-4 align-top"><div>{new Date(event.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</div><div className="text-xs text-gray-500">{formatTimeForDisplay(event.startTime)} - {formatTimeForDisplay(event.endTime)}</div></td>
            <td className="px-6 py-4 align-top">{bartenders && <div className="text-xs"><span className="font-semibold">Bartenders:</span> {bartenders}</div>}{barBacks && <div className="text-xs mt-1"><span className="font-semibold">Bar Backs:</span> {barBacks}</div>}{!bartenders && !barBacks && <div className="text-xs italic text-gray-500">No staff assigned</div>}</td>
            <td className="px-6 py-4 align-top text-right"><div className="flex justify-end items-center gap-2"><button onClick={() => onSync(event, currentUser.id)} className="p-2 text-teal-600 hover:bg-gray-200 rounded-md transition" title="Sync to Calendar"><Download size={18} /></button>{currentUserRole === 'manager' && (<><button onClick={() => onEdit(event)} className="p-2 text-blue-600 hover:bg-gray-200 rounded-md transition" title="Edit Event"><Edit size={18} /></button><button onClick={() => onDelete(event.id)} className="p-2 text-red-600 hover:bg-gray-200 rounded-md transition" title="Delete Event"><Trash2 size={18} /></button></>)}</div></td>
        </tr>
    );
};

const CalendarView = ({ events, onEventClick }) => {
    const [currentDate, setCurrentDate] = useState(new Date());

    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
    const startDate = new Date(startOfMonth);
    startDate.setDate(startDate.getDate() - startOfMonth.getDay());
    const endDate = new Date(endOfMonth);
    endDate.setDate(endDate.getDate() + (6 - endOfMonth.getDay()));

    const days = [];
    let day = new Date(startDate);

    while (day <= endDate) {
        days.push(new Date(day));
        day.setDate(day.getDate() + 1);
    }
    
    const eventsByDate = events.reduce((acc, event) => {
        const dateKey = new Date(event.date).toISOString().split('T')[0];
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(event);
        return acc;
    }, {});
    
    const changeMonth = (offset) => {
        setCurrentDate(prev => new Date(prev.getFullYear(), prev.getMonth() + offset, 1));
    }

    return (
        <div className="bg-white rounded-lg shadow-lg p-4">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronLeft size={24}/></button>
                <h2 className="text-xl font-bold">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h2>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-100"><ChevronRight size={24}/></button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center font-semibold text-gray-600 text-sm">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => <div key={d}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-1 mt-2">
                {days.map((d, i) => {
                    const dateKey = d.toISOString().split('T')[0];
                    const dayEvents = eventsByDate[dateKey] || [];
                    const isCurrentMonth = d.getMonth() === currentDate.getMonth();
                    const isToday = new Date().toISOString().split('T')[0] === dateKey;

                    return (
                        <div key={i} className={`border rounded-lg p-2 h-32 flex flex-col ${isCurrentMonth ? 'bg-white' : 'bg-gray-50 text-gray-400'}`}>
                           <div className={`font-semibold self-start px-2 py-0.5 rounded-full text-sm ${isToday ? 'bg-blue-600 text-white' : ''}`}>{d.getDate()}</div>
                           <div className="overflow-y-auto mt-1 space-y-1 text-left text-xs">
                               {dayEvents.map(event => (
                                   <div key={event.id} onClick={() => onEventClick(event)} className="bg-blue-100 text-blue-800 p-1 rounded cursor-pointer hover:bg-blue-200 truncate">
                                       {event.name}
                                   </div>
                               ))}
                           </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

// --- STAFF MANAGEMENT COMPONENTS ---

const StaffManager = ({ staff, onAdd, onEdit, onDelete, currentUserRole }) => (
    <div className="bg-white rounded-lg shadow-lg">
        <div className="p-4 flex justify-between items-center">
            <h2 className="text-2xl font-bold">Staff Management</h2>
            {currentUserRole === 'manager' && <button onClick={onAdd} className="flex items-center bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md hover:bg-blue-700 transition"><Plus size={20} className="mr-2"/>Add Employee</button>}
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm text-left text-gray-600"><thead className="text-xs text-gray-700 uppercase bg-gray-100"><tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Contact</th><th className="px-6 py-3">Positions</th><th className="px-6 py-3">Role</th>{currentUserRole === 'manager' && <th className="px-6 py-3 text-right">Actions</th>}</tr></thead>
        <tbody>{staff.map(person => (
            <tr key={person.id} className="bg-white border-b hover:bg-gray-50">
                <td className="px-6 py-4 font-medium text-gray-900">{person.firstName} {person.lastName}</td>
                <td className="px-6 py-4"><div>{person.email}</div><div className="text-xs text-gray-500">{person.phone}</div></td>
                <td className="px-6 py-4"><div className="flex flex-wrap gap-1">{person.positions.map(p => <span key={p} className="bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded-full capitalize">{p}</span>)}</div></td>
                <td className="px-6 py-4 capitalize">{person.role}</td>
                {currentUserRole === 'manager' && <td className="px-6 py-4 text-right"><div className="flex justify-end gap-2"><button onClick={() => onEdit(person)} className="p-2 text-blue-600 hover:bg-gray-200 rounded-md"><Edit size={18}/></button><button onClick={() => onDelete(person.id)} className="p-2 text-red-600 hover:bg-gray-200 rounded-md"><Trash2 size={18}/></button></div></td>}
            </tr>
        ))}</tbody>
        </table></div>
    </div>
);

const StaffModal = ({ staffMember, onClose, onSave }) => {
    const [formData, setFormData] = useState({
        id: staffMember?.id || null,
        firstName: staffMember?.firstName || '',
        lastName: staffMember?.lastName || '',
        email: staffMember?.email || '',
        phone: staffMember?.phone || '',
        positions: staffMember?.positions || [],
        role: staffMember?.role || 'user',
    });
    const [errors, setErrors] = useState({});

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePositionChange = (position) => {
        setFormData(prev => ({ ...prev, positions: prev.positions.includes(position) ? prev.positions.filter(p => p !== position) : [...prev.positions, position]}));
    };

    const validate = () => {
        const tempErrors = {};
        if (!formData.firstName) tempErrors.firstName = "First name is required.";
        if (!formData.lastName) tempErrors.lastName = "Last name is required.";
        if (!formData.email) tempErrors.email = "Email is required.";
        if (formData.positions.length === 0) tempErrors.positions = "At least one position is required.";
        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"><div className="bg-white rounded-lg shadow-2xl w-full max-w-lg"><header className="flex justify-between items-center p-5 border-b"><h2 className="text-2xl font-bold">{staffMember ? 'Edit Staff Member' : 'Add New Staff Member'}</h2><button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button></header><form onSubmit={handleSubmit}><div className="p-6 space-y-4">
            <div className="grid grid-cols-2 gap-4"><InputField label="First Name" name="firstName" value={formData.firstName} onChange={handleChange} error={errors.firstName} required /><InputField label="Last Name" name="lastName" value={formData.lastName} onChange={handleChange} error={errors.lastName} required /></div>
            <div className="grid grid-cols-2 gap-4"><InputField label="Email Address" name="email" type="email" value={formData.email} onChange={handleChange} error={errors.email} required /><InputField label="Phone Number" name="phone" type="tel" value={formData.phone} onChange={handleChange} /></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Positions {errors.positions && <span className="text-red-500 text-xs ml-1">({errors.positions})</span>}</label><div className="flex gap-4">
                {['bartender', 'bar back'].map(pos => (<label key={pos} className="flex items-center"><input type="checkbox" checked={formData.positions.includes(pos)} onChange={() => handlePositionChange(pos)} className="h-4 w-4 rounded border-gray-300 text-blue-600 mr-2"/> <span className="capitalize">{pos}</span></label>))}
            </div></div>
            <div><label className="block text-sm font-medium text-gray-700 mb-1">Role</label><select name="role" value={formData.role} onChange={handleChange} className="w-full p-2 border border-gray-300 rounded-md"><option value="user">User</option><option value="manager">Manager</option></select></div>
        </div><footer className="flex justify-end items-center p-5 border-t bg-gray-50"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md mr-3 hover:bg-gray-300">Cancel</button><button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Save</button></footer></form></div></div>
    );
};


// --- GENERIC & MODAL COMPONENTS ---

const EventModal = ({ event, onClose, onSave, staffList }) => {
    const [formData, setFormData] = useState({
        id: event?.id || null,
        name: event?.name || '',
        contactName: event?.contactName || '',
        contactPhone: event?.contactPhone || '',
        date: event ? formatDateForInput(new Date(event.date)) : '',
        startTime: event?.startTime || '',
        endTime: event?.endTime || '',
        bartenders: event?.bartenders || [],
        barBacks: event?.barBacks || [],
        eventType: event?.eventType || 'paid',
        eventNotes: event?.eventNotes || '',
        barTrusteeNotes: event?.barTrusteeNotes || '',
        barSchedulerNotes: event?.barSchedulerNotes || '',
    });
    
    const [errors, setErrors] = useState({});

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleStaffChange = (role, selectedIds) => setFormData(prev => ({...prev, [role]: selectedIds}));
    
    const validate = () => {
      const tempErrors = {};
      if (!formData.name) tempErrors.name = "Event name is required.";
      if (!formData.contactName) tempErrors.contactName = "Contact name is required.";
      if (!formData.date) tempErrors.date = "Event date is required.";
      if (!formData.startTime) tempErrors.startTime = "Start time is required.";
      if (!formData.endTime) tempErrors.endTime = "End time is required.";
      setErrors(tempErrors);
      return Object.keys(tempErrors).length === 0;
    }

    const handleSubmit = (e) => {
        e.preventDefault();
        if (validate()) onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4"><div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col"><header className="flex justify-between items-center p-5 border-b"><h2 className="text-2xl font-bold text-gray-800">{event ? 'Edit Event' : 'Create New Event'}</h2><button onClick={onClose} className="text-gray-500 hover:text-gray-800"><X size={24} /></button></header><form onSubmit={handleSubmit} className="flex-grow overflow-y-auto"><div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><InputField label="Event Name" name="name" value={formData.name} onChange={handleChange} error={errors.name} required /><div><label htmlFor="eventType" className="block text-sm font-medium text-gray-700 mb-1">Event Type <span className="text-red-500">*</span></label><select id="eventType" name="eventType" value={formData.eventType} onChange={handleChange} className="w-full px-3 py-2 border border-gray-300 rounded-md"><option value="paid">Paid</option><option value="volunteer">Volunteer</option></select></div></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><InputField label="Event Date" name="date" type="date" value={formData.date} onChange={handleChange} error={errors.date} required /><InputField label="Contact Name" name="contactName" value={formData.contactName} onChange={handleChange} error={errors.contactName} required /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><InputField label="Contact Phone" name="contactPhone" type="tel" value={formData.contactPhone} onChange={handleChange} /><div/></div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6"><InputField label="Start Time" name="startTime" type="time" value={formData.startTime} onChange={handleChange} error={errors.startTime} required /><InputField label="End Time" name="endTime" type="time" value={formData.endTime} onChange={handleChange} error={errors.endTime} required /></div>
            
            <div className="border-t pt-6 space-y-4">
                 <h3 className="text-lg font-semibold text-gray-700">Notes</h3>
                 <TextareaField label="Event Notes" name="eventNotes" value={formData.eventNotes} onChange={handleChange} />
                 <TextareaField label="Bar Trustee Notes" name="barTrusteeNotes" value={formData.barTrusteeNotes} onChange={handleChange} />
                 <TextareaField label="Bar Scheduler Notes" name="barSchedulerNotes" value={formData.barSchedulerNotes} onChange={handleChange} />
            </div>

            <div className="border-t pt-6"><h3 className="text-lg font-semibold text-gray-700 mb-4">Assign Staff</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <StaffSelector role="Bartenders" staffList={staffList.filter(s => s.positions.includes('bartender'))} selected={formData.bartenders} onChange={(ids) => handleStaffChange('bartenders', ids)} max={6} />
                <StaffSelector role="Bar Backs" staffList={staffList.filter(s => s.positions.includes('bar back'))} selected={formData.barBacks} onChange={(ids) => handleStaffChange('barBacks', ids)} max={2} />
            </div></div>
        </div><footer className="flex justify-end items-center p-5 border-t bg-gray-50"><button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md mr-3 hover:bg-gray-300">Cancel</button><button type="submit" className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-md hover:bg-blue-700">Save Event</button></footer></form></div></div>
    );
};

const InputField = ({ label, name, type = 'text', value, onChange, error, required }) => (
    <div><label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label} {required && <span className="text-red-500">*</span>}</label><input type={type} id={name} name={name} value={value} onChange={onChange} className={`w-full px-3 py-2 border ${error ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500`}/>{error && <p className="text-red-500 text-xs mt-1">{error}</p>}</div>
);

const TextareaField = ({ label, name, value, onChange, rows = 3 }) => (
    <div>
        <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <textarea
            id={name}
            name={name}
            value={value}
            onChange={onChange}
            rows={rows}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
    </div>
);

const StaffSelector = ({ role, staffList, selected, onChange, max }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);

    useEffect(() => {
        function handleClickOutside(event) { if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setIsOpen(false); }
        if (isOpen) document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [isOpen]);
    
    const handleSelect = (staffId) => {
        const newSelected = selected.includes(staffId) ? selected.filter(id => id !== staffId) : (selected.length < max ? [...selected, staffId] : selected);
        onChange(newSelected);
    };

    const selectedStaffNames = staffList.filter(s => selected.includes(s.id)).map(s => `${s.firstName} ${s.lastName}`).join(', ') || `Select ${role}...`;

    return (
        <div className="relative" ref={wrapperRef}><label className="block text-sm font-medium text-gray-700 mb-1">{role} ({selected.length}/{max})</label><button type="button" onClick={() => setIsOpen(!isOpen)} className="w-full text-left bg-white border border-gray-300 rounded-md shadow-sm px-3 py-2 flex justify-between items-center"><span className="truncate">{selectedStaffNames}</span><svg className={`w-5 h-5 text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg></button>
        {isOpen && (<div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto"><ul>
            {staffList.map(person => (<li key={person.id} onClick={() => handleSelect(person.id)} className="px-3 py-2 cursor-pointer hover:bg-gray-100 flex items-center"><input type="checkbox" checked={selected.includes(person.id)} readOnly className="mr-3 h-4 w-4 rounded border-gray-300 text-blue-600"/>{person.firstName} {person.lastName}</li>))}
        </ul></div>)}
        </div>
    );
};

const Notification = ({ message, onClose }) => ( <div className="fixed top-5 right-5 bg-blue-600 text-white py-3 px-5 rounded-lg shadow-lg flex items-center z-[100]"><Bell size={20} className="mr-3" /><p>{message}</p><button onClick={onClose} className="ml-4 text-white hover:text-indigo-200"><X size={18} /></button></div> );

const ShiftWarningModal = ({ duration, onConfirm, onCancel }) => ( <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100]"><div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4"><div className="flex items-start"><div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 sm:mx-0 sm:h-10 sm:w-10"><AlertTriangle className="h-6 w-6 text-yellow-600"/></div><div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left"><h3 className="text-lg font-medium text-gray-900">Shift Duration Warning</h3><div className="mt-2"><p className="text-sm text-gray-500">This shift is scheduled for <strong>{duration} hours</strong>, which is over the standard 5-hour agreement.</p><p className="text-sm text-gray-500 mt-2">Do you want to proceed and save this shift?</p></div></div></div><div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse"><button type="button" className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 sm:ml-3 sm:w-auto sm:text-sm" onClick={onConfirm}>Proceed & Save</button><button type="button" className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 sm:mt-0 sm:w-auto sm:text-sm" onClick={onCancel}>Cancel</button></div></div></div> );

const ConfirmModal = ({ message, onConfirm, onCancel }) => ( <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100]"><div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-sm mx-4"><h3 className="text-lg font-semibold text-gray-800 mb-4">{message}</h3><div className="flex justify-end gap-4 mt-6"><button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300">Cancel</button><button onClick={onConfirm} className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">Delete</button></div></div></div> );

export default App;

