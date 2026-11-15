Flame Runner

Flame Runner es nuestro proyecto para el NASA Space Apps Challenge 2026, dentro del reto Flame in Freefall.

En la Tierra, el aire caliente sube y alimenta la llama, pero en una nave espacial esa corriente no existe. Allí el fuego cambia de forma, es más difícil de ver y se apaga de otra manera. La NASA lleva décadas estudiándolo en la Estación Espacial, pero sus resultados están repartidos en miles de documentos técnicos que pocas personas pueden revisar a fondo.

Para resolverlo, reunimos esos documentos del repositorio público de la NASA en una sola base de datos, con 24 investigaciones, más de dos mil pruebas y más de diez mil páginas. De ahí extrajimos 1 568 hallazgos, y cada uno lo comprobamos contra el texto original antes de aceptarlo.

Con esa base construimos un sitio donde eliges un escenario de misión, como la Estación Espacial, un hábitat en la Luna o uno en Marte, y ves qué se ha probado en esas condiciones y qué falta por investigar. También incluye un asistente al que puedes preguntarle en español o en inglés. El asistente no inventa: busca en la base de datos, responde solo con lo que dicen los documentos de la NASA y cita cada dato, de modo que puedes abrir la página original de donde sale. Si la pregunta no tiene que ver con el fuego en el espacio, simplemente no la responde.

Uno de los hallazgos más claros es que casi toda la evidencia viene de la microgravedad. Para la gravedad de la Luna y de Marte, y con el oxígeno previsto para esos hábitats, prácticamente no hay pruebas, y esa es justamente una de las prioridades que el sitio ayuda a ver.

El proyecto usa Python con FastAPI y SQLite en el backend, y React con Tailwind en el frontend. El asistente funciona con Gemma 4 en un servidor del equipo y usa Claude como respaldo. Todos los datos e imágenes son de la NASA.
