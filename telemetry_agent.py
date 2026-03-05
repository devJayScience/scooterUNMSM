import os
import time
import random
import math
import requests
from dotenv import load_dotenv
from supabase import create_client, Client

# Cargar credenciales desde el .env existente en el proyecto raiz
load_dotenv()

SUPABASE_URL = os.getenv("VITE_SUPABASE_URL")
SUPABASE_KEY = os.getenv("VITE_SUPABASE_ANON_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Error: No se encontraron las variables de entorno de Supabase.")
    exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# ==========================================
# Configuración del Entorno de Simulación
# ==========================================
HIGH_DEMAND_DAY = False  # Modo Evento: True para Aniversario/Fútbol (mayor# Constantes de Simulación Física
SPEED_MS = 15.0 # Súper velocidad para completar en < 5s
POLLING_INTERVAL = 0.1 # Tick Rate ultra rápido (10hz)

# Nodos del Campus (Hardcoded parcial para demo, simulando los datos del front)
CAMPUS_NODES = [
    {"id": "ing-ind", "name": "Facultad de Ingeniería Industrial", "lat": -12.056094, "lng": -77.084345},
    {"id": "bib-cen", "name": "Biblioteca Central", "lat": -12.055812, "lng": -77.082522},
    {"id": "comedor", "name": "Comedor Universitario", "lat": -12.058334, "lng": -77.081112},
    {"id": "fisi", "name": "Facultad de Sist. e Info.", "lat": -12.056581, "lng": -77.081829}
]

def get_osrm_route(start, end):
    """ Módulo GPS Neo-8M: Traza la ruta realista por las calles/veredas usando OSRM """
    url = f"https://router.project-osrm.org/route/v1/foot/{start[1]},{start[0]};{end[1]},{end[0]}?overview=full&geometries=geojson"
    try:
        res = requests.get(url)
        data = res.json()
        if data.get("code") == "Ok":
            coords = data["routes"][0]["geometry"]["coordinates"]
            # OSRM retorna [lng, lat], convertimos a [lat, lng]
            route = [(c[1], c[0]) for c in coords]
            distance = data["routes"][0]["distance"]
            duration = data["routes"][0]["duration"]
            return route, distance, duration
    except Exception as e:
        print(f"[Error de Conexión GPS] {e}")
    # Fallback ruta recta
    return [start, end], 0, 0

def simulate_ultrasonic_sensor():
    """ 
    Sensores Ultrasónicos (Ítem 4): Simula la lectura frontal.
    Devuelve la distancia a un posible obstáculo en cm.
    Probabilidad de Fallo/Obstáculo desactivada para visualización continua.
    """
    return random.randint(100, 300)   # Camino libre SIEMPRE

def main():
    print("=====================================================")
    print(" INICIANDO AGENTE DE TELEMETRÍA IOT (GEMELO DIGITAL) ")
    print(" ESP32 - Neo-8M - Sensor Ultrasónico - Motor BTS7960 ")
    print("=====================================================")

    active_missions = {}

    while True:
        try:
            # 1. Caja de Control (ESP32): Escucha señales "Solicitar Viaje" desde la base de datos
            # En UI: Al presionar 'Solicitar', status pasa a 'occupied'
            response = supabase.table("scooters").select("*").eq("status", "occupied").execute()
            scooters = response.data

            # Limpiar scooters que fueron liberados externamente o manualmente (ej. por admin)
            current_occupied_ids = [s["id"] for s in scooters]
            ended_missions = [mid for mid in active_missions.keys() if mid not in current_occupied_ids]
            for mid in ended_missions:
                   del active_missions[mid]

            for scooter in scooters:
                sid = scooter["id"]

                # Si es un nuevo servicio detectado
                if sid not in active_missions:
                    # Mock: Para la demo, generaremos una ubicación inicial hipotética del estudiante
                    student_pos = (-12.0598148, -77.0842696) # Posición mock estudiante (Puerta 3)
                    destination_node = random.choice(CAMPUS_NODES)
                    dest_pos = (destination_node["lat"], destination_node["lng"])

                    print(f"\n[ESP32] 📻 Nueva misión recibida para {sid}.")
                    print(f"[GPS Neo-8M] Calculando ruta al usuario...")
                    
                    # Fase 1: Scooter al Estudiante
                    route_to_student, dist1, _ = get_osrm_route((scooter["lat"], scooter["lng"]), student_pos)
                    # Fase 2: Estudiante al Destino Final
                    route_to_dest, dist2, _ = get_osrm_route(student_pos, dest_pos)

                    # Driver Motor (Ítem 5): Calcula ETA real técnico = (distancia / velocidad_ms)
                    eta_seconds = (dist1 + dist2) / SPEED_MS

                    active_missions[sid] = {
                        "phase": "to_student",
                        "route": route_to_student,
                        "dest_route": route_to_dest,
                        "current_step": 0,
                        "destination_name": destination_node["name"]
                    }
                    print(f"[Sistema] ETA Técnico Calculado: {eta_seconds:.1f} segundos.")

                mission = active_missions[sid]

                # 2. Sensores Ultrasónicos (Ítem 4): Lectura en tiempo real
                prox = simulate_ultrasonic_sensor()
                if prox < 50:
                    print(f"\n🚨 [Sensor Ultrasónico] ¡OBSTÁCULO DETECTADO A {prox}cm (Scooter {sid})!")
                    print(f"[Driver Motor] Cortando energía inmediatamente...")
                    # Comando de interrupción
                    try:
                        supabase.table("scooters").update({"status": "maintenance"}).eq("id", sid).execute()
                    except Exception as e:
                        print("Fallo al actualizar error:", e)
                    ended_missions.append(sid)
                    continue # Salta al siguiente scooter

                # 3. Simulación de Movimiento y Telemetría
                if mission["current_step"] < len(mission["route"]) - 1:
                    mission["current_step"] += 1
                    next_pos = mission["route"][mission["current_step"]]

                    # Analítica Dinámica: Degradación de batería (LiPo)
                    # Si es día de alta demanda, la batería baja al doble de velocidad por sobrecalentamiento térmico
                    battery_drain = 0.5 if HIGH_DEMAND_DAY else 0.1
                    new_battery = max(0, round(scooter["battery"] - battery_drain, 2))

                    # PATCH de Telemetría hacia Supabase (Actualiza Lat/Lng/Battery en Realtime DB)
                    supabase.table("scooters").update({
                        "lat": next_pos[0],
                        "lng": next_pos[1],
                        "battery": new_battery
                    }).eq("id", sid).execute()

                    print(f"📡 [{sid}] GPS: {next_pos[0]:.6f}, {next_pos[1]:.6f} | Bat: {new_battery}% | Motor: ON")
                else:
                    # Cambio de estado lógico (Máquina de estados ESP32)
                    if mission["phase"] == "to_student":
                        mission["phase"] = "to_dest"
                        mission["route"] = mission["dest_route"]
                        mission["current_step"] = 0
                        print(f"\n✅ [ESP32] {sid} recogió al estudiante. Ruta hacia {mission['destination_name']} iniciada.")
                    else:
                        # FINALIZACIÓN: Completó el recorrido
                        print(f"\n🏁 [{sid}] Llegada al nodo destino ({mission['destination_name']})")
                        
                        # Liberar scooter en DB
                        try:
                            supabase.table("scooters").update({"status": "available"}).eq("id", sid).execute()
                            
                            # Guardar analítica de viaje en `trips`
                            order_code = f"ORD-{random.randint(1000,9999)}"
                            supabase.table("trips").insert({
                                "order_code": order_code,
                                "scooter_id": sid,
                                "destination": mission['destination_name'],
                                "status": "Completada"
                            }).execute()
                            print(f"🔒 [Sistema] Viaje almacenado: {order_code}. Scooter liberado.")
                        except Exception as e:
                            print("Error al guardar viaje (probable restricción de bd):", e)
                            
                        ended_missions.append(sid)

            # Limpiamos todos los eliminados fuera del loop principal
            for mid in set(ended_missions):
                if mid in active_missions:
                    del active_missions[mid]

            time.sleep(POLLING_INTERVAL)

        except Exception as e:
            print(f"[Error General Sistema] {e}")
            time.sleep(POLLING_INTERVAL)

if __name__ == "__main__":
    main()
