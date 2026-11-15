Flame Runner

Flame Runner is our project for the NASA Space Apps Challenge 2026, part of the Flame in Freefall challenge.

On Earth, hot air rises and feeds the flame, but on a spacecraft that airflow does not exist. There, fire changes shape, becomes harder to see, and goes out in a different way. NASA has been studying this for decades on the Space Station, but the results are spread across thousands of technical documents that few people can review in depth.

To solve this, we gathered those documents from NASA's Physical Sciences Informatics (PSI) repository into a single database, with 24 investigations, more than two thousand tests, and more than ten thousand pages. From it we extracted 1,568 findings, and we checked each one against the original text before accepting it.

With that database we built a site where you choose a mission scenario, from the Space Station to a lunar habitat, a pressurized rover, or a base on Mars, and see what has been tested under those conditions and what still needs research. A dedicated ranking orders every investigation by how relevant it is to that scenario and explains why, and a comparison view puts investigations side by side to show their hardware, fuels, test conditions, what changed between tests, and what they measured. Researchers can also download the test data as CSV files to support predictive flammability models.

The site includes an evidence assistant you can ask in English or Spanish. It does not make things up: it searches the database, answers only with what NASA documents say, and cites every piece of data, so you can open the original page it comes from. When you ask which investigations matter most, it uses the same ranking shown on the site. If a question has nothing to do with fire in space, it simply does not answer it.

One of the clearest findings is that almost all the evidence comes from microgravity. PSI does not yet contain any partial-gravity combustion tests, and there are practically no tests with the oxygen levels planned for lunar habitats. The site shows this gap openly and explains how microgravity and Earth results can bound what happens on the Moon and Mars until missions like LUCI and FM2 provide real data. It also connects this research to next-generation fire safety equipment and to its applications on Earth, such as water mist extinguishers, smoke detection, and firefighter gear.

The project uses Python with FastAPI and SQLite on the backend, and React with Tailwind on the frontend. The assistant runs on Gemma 4 on a team server and uses Claude as a fallback. All data and images come from NASA.

URL: https://flame-runner-frontend.onrender.com/

## Use of artificial intelligence

We used AI tools during development, always under the team's direction and review. Claude, by Anthropic, helped us automate the collection of information from the resources provided by NASA Space Apps and the PSI repository, extract and verify findings from the documents, carry out repetitive tasks such as data cleaning and translation, review code, and keep the project consistent with the structure our team defined. Every extracted finding was automatically checked against the exact text of its source document, and the design decisions, scope, and final content were decided and validated by the team.

Inside the product, AI is used in two places: Claude extracted the findings that make up the knowledge base, and the evidence assistant uses Gemma 4, with Claude as a fallback, to answer questions using only the sources retrieved from that base.

## Run it locally with Docker

The whole project runs with Docker Compose in three services: Ollama with the Gemma 4 model, the FastAPI backend, and the React frontend served by nginx. The database is a SQLite file, so it lives in a volume of the backend instead of a separate service, and it is downloaded automatically from the `db-v2` release the first time.

    docker compose up -d --build
    docker compose run --rm model

The second command downloads Gemma 4 E4B (about 6.6 GB) once. The site is then available at http://localhost:8080, and the API at http://localhost:8000/api/health. With an NVIDIA GPU and the NVIDIA Container Toolkit installed, start it with `docker compose -f docker-compose.yml -f docker-compose.gpu.yml up -d --build` so the model runs on the GPU.

Settings can go in a `.env` file next to `docker-compose.yml`: `LLM_MODEL` changes the model, `ANTHROPIC_API_KEY` enables Claude as a fallback, and `FRONTEND_PORT` or `BACKEND_PORT` change the ports. On a Mac, Docker cannot use the Apple GPU, so it is faster to run Ollama natively and point the backend to it with `LOCAL_LLM_URL=http://host.docker.internal:11434/v1`, then start only `docker compose up -d --build --no-deps backend frontend`.

Without Docker, `./setup.sh` installs the Python environment, Ollama, the model, the database and the frontend dependencies.
