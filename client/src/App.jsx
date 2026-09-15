import React, { useState } from 'react';
import { 
  Search, SlidersHorizontal, MapPin, Heart, X, 
  MessageCircle, User, ArrowLeft, Send, Sparkles, Plus, BookOpen
} from 'lucide-react';
import './App.css';

// Mock de profesores según tus notas
const INITIAL_TUTORS = [
  {
    id: 1,
    name: "Martín Benítez",
    age: 28,
    subjects: ["Física I", "Química", "Matemática"],
    distance: 50,
    rate: 15,
    cv: "Licenciado en Ciencias Físicas (UBA). 5 años dictando clases particulares y preparación para exámenes de ingreso.",
    bio: "Clases prácticas con resolución paso a paso de ejercicios.",
    avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400"
  },
  {
    id: 2,
    name: "Lucía Fernández",
    age: 32,
    subjects: ["Cálculo", "Álgebra Lineal"],
    distance: 100,
    rate: 20,
    cv: "Ingeniera Electrónica con posgrado en docencia universitaria.",
    bio: "Hago que las matemáticas difíciles se entiendan en la primera clase.",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400"
  },
  {
    id: 3,
    name: "Esteban Rojas",
    age: 25,
    subjects: ["Inglés C1", "First Certificate"],
    distance: 200,
    rate: 18,
    cv: "Profesor de lengua inglesa certificado por Cambridge.",
    bio: "Enfoque 100% conversacional e intensivo para entrevistas y exámenes.",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400"
  }
];

export default function App() {
  // Estados de navegación: 'auth' | 'grid' | 'swipe' | 'detail' | 'chats'
  const [currentScreen, setCurrentScreen] = useState('auth');
  const [activeTab, setActiveTab] = useState('ubi'); // 'ubi' | 'aleat' | 'profile'
  
  // Datos
  const [tutors, setTutors] = useState(INITIAL_TUTORS);
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [swipeIndex, setSwipeIndex] = useState(0);
  const [maxDistance, setMaxDistance] = useState(500);
  const [searchQuery, setSearchQuery] = useState('');
  const [chats, setChats] = useState([
    { id: 1, name: "Martín Benítez", lastMsg: "Hola! ¿Cuándo te viene bien la clase?", time: "10:30" }
  ]);

  // --- Capa 1: Login / Registro ---
  if (currentScreen === 'auth') {
    return (
      <div className="phone-container">
        <div className="screen auth-screen">
          <div className="brand-header">
            <h2>TutorMatch</h2>
            <p>Conecta con tu profesor ideal</p>
          </div>
          <div className="auth-form">
            <div className="input-group">
              <label>Usuario / Email</label>
              <input type="text" placeholder="ej. alumno@mail.com" defaultValue="alumno123" />
            </div>
            <div className="input-group">
              <label>Contraseña</label>
              <input type="password" placeholder="••••••••" defaultValue="secret" />
            </div>
            <button className="btn-primary" onClick={() => setCurrentScreen('grid')}>
              Ingresar
            </button>
            <button className="btn-secondary">
              Registrarse
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Filtro por búsqueda y distancia (metros)
  const filteredTutors = tutors.filter(t => 
    t.distance <= maxDistance &&
    (t.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
     t.subjects.some(s => s.toLowerCase().includes(searchQuery.toLowerCase())))
  );

  return (
    <div className="phone-container">
      {/* --- Capa 2: Grid de Perfiles con Filtro de Distancia --- */}
      {currentScreen === 'grid' && (
        <div className="screen">
          <div className="top-search-bar">
            <div className="search-input-box">
              <Search size={18} color="#64748b" />
              <input 
                type="text" 
                placeholder="Buscar materia o profe..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <button className="btn-icon" title="Filtro de distancia">
              <SlidersHorizontal size={20} />
            </button>
          </div>

          <div className="distance-chips">
            {[50, 100, 200, 500].map(dist => (
              <button 
                key={dist} 
                className={`chip ${maxDistance === dist ? 'active' : ''}`}
                onClick={() => setMaxDistance(dist)}
              >
                {dist} mts
              </button>
            ))}
          </div>

          <div className="grid-list">
            {filteredTutors.map(tutor => (
              <div 
                key={tutor.id} 
                className="grid-card"
                onClick={() => {
                  setSelectedTutor(tutor);
                  setCurrentScreen('detail');
                }}
              >
                <div className="grid-card-img" style={{ backgroundImage: `url(${tutor.avatar})` }}>
                  <span className="badge-dist"><MapPin size={10} /> {tutor.distance}m</span>
                </div>
                <div className="grid-card-meta">
                  <h4>{tutor.name}</h4>
                  <p>{tutor.subjects[0]}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Capa 3: Swipe Card ("PP" - Perfil Principal estilo Tinder) --- */}
      {currentScreen === 'swipe' && (
        <div className="screen swipe-screen">
          {swipeIndex < tutors.length ? (
            <div className="tinder-card">
              <div 
                className="tinder-img" 
                style={{ backgroundImage: `url(${tutors[swipeIndex].avatar})` }}
              >
                <span className="badge-dist"><MapPin size={12} /> {tutors[swipeIndex].distance} mts</span>
              </div>
              <div className="tinder-body">
                <div className="tinder-row">
                  <h3>{tutors[swipeIndex].name}, {tutors[swipeIndex].age}</h3>
                  <span className="price">${tutors[swipeIndex].rate}/h</span>
                </div>
                <div className="tags">
                  {tutors[swipeIndex].subjects.map((sub, i) => (
                    <span key={i} className="tag-subject">{sub}</span>
                  ))}
                </div>
                <p className="bio">{tutors[swipeIndex].bio}</p>
              </div>

              <div className="swipe-actions">
                <button 
                  className="btn-round btn-cancel" 
                  onClick={() => setSwipeIndex(prev => prev + 1)}
                >
                  <X size={28} />
                </button>
                <button 
                  className="btn-round btn-heart" 
                  onClick={() => {
                    const tutorMatched = tutors[swipeIndex];
                    if (!chats.some(c => c.name === tutorMatched.name)) {
                      setChats([...chats, { 
                        id: Date.now(), 
                        name: tutorMatched.name, 
                        lastMsg: "¡Nuevo match! Comienza la conversación", 
                        time: "Ahora" 
                      }]);
                    }
                    setSelectedTutor(tutorMatched);
                    setCurrentScreen('detail');
                  }}
                >
                  <Heart size={28} />
                </button>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No quedan más profesores en tu radio de búsqueda.</p>
              <button className="btn-primary" onClick={() => setSwipeIndex(0)}>
                Volver a revisar
              </button>
            </div>
          )}
        </div>
      )}

      {/* --- Capa 4: Detalle Completo del Profesor ("Al elegir uno") --- */}
      {currentScreen === 'detail' && selectedTutor && (
        <div className="screen detail-screen">
          <div className="detail-top-nav">
            <button className="btn-back" onClick={() => setCurrentScreen('grid')}>
              <ArrowLeft size={22} />
            </button>
            <h3>Detalle del Docente</h3>
            <div style={{ width: 22 }}></div>
          </div>

          <div className="detail-scrollable">
            <div className="detail-banner" style={{ backgroundImage: `url(${selectedTutor.avatar})` }}>
              <button 
                className="btn-floating-add" 
                title="Desbloquear Chat / Conectar"
                onClick={() => setCurrentScreen('chats')}
              >
                <Plus size={26} />
              </button>
            </div>
            
            <div className="detail-content">
              <h2>{selectedTutor.name} ({selectedTutor.age} años)</h2>
              <p className="detail-loc"><MapPin size={16} /> Aprox a {selectedTutor.distance} metros de ti</p>

              <div className="section-block">
                <h4><BookOpen size={16} /> Materias que dicta:</h4>
                <div className="tags">
                  {selectedTutor.subjects.map((sub, i) => (
                    <span key={i} className="tag-subject">{sub}</span>
                  ))}
                </div>
              </div>

              <div className="section-block">
                <h4>Trayectoria y CV</h4>
                <p className="text-cv">{selectedTutor.cv}</p>
              </div>

              <button 
                className="btn-primary full-width" 
                onClick={() => setCurrentScreen('chats')}
              >
                Contactar al Profesor
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- Capa 5: Lista de Chats Activos ("Se desbloquea chat") --- */}
      {currentScreen === 'chats' && (
        <div className="screen chats-screen">
          <div className="chat-header">
            <h3>Mensajes</h3>
          </div>
          <div className="chat-list">
            {chats.map(chat => (
              <div 
                key={chat.id} 
                className="chat-item" 
                onClick={() => alert(`Abriendo conversación con ${chat.name}...`)}
              >
                <div className="avatar-circle">{chat.name[0]}</div>
                <div className="chat-preview">
                  <div className="chat-name-row">
                    <strong>{chat.name}</strong>
                    <span>{chat.time}</span>
                  </div>
                  <p>{chat.lastMsg}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* --- Barra de Navegación Inferior (Tabs de tu pizarra) --- */}
      {currentScreen !== 'auth' && (
        <nav className="bottom-tabs">
          <button 
            className={`tab-btn ${currentScreen === 'grid' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('grid')}
          >
            <MapPin size={20} />
            <span>Por Ubi aprox</span>
          </button>
          <button 
            className={`tab-btn ${currentScreen === 'swipe' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('swipe')}
          >
            <Sparkles size={20} />
            <span>Aleat / Swipe</span>
          </button>
          <button 
            className={`tab-btn ${currentScreen === 'chats' ? 'active' : ''}`}
            onClick={() => setCurrentScreen('chats')}
          >
            <MessageCircle size={20} />
            <span>Chats</span>
          </button>
        </nav>
      )}
    </div>
  );
}
