Flame Runner

Flame Runner is our project for the NASA Space Apps Challenge 2026, part of the Flame in Freefall challenge.

On Earth, hot air rises and feeds the flame, but on a spacecraft that airflow does not exist. There, fire changes shape, becomes harder to see, and goes out in a different way. NASA has been studying this for decades on the Space Station, but the results are spread across thousands of technical documents that few people can review in depth.

To solve this, we gathered those documents from NASA's public repository into a single database, with 24 investigations, more than two thousand tests, and more than ten thousand pages. From it we extracted 1,568 findings, and we checked each one against the original text before accepting it.

With that database we built a site where you choose a mission scenario, such as the Space Station, a habitat on the Moon, or one on Mars, and see what has been tested under those conditions and what still needs research. It also includes an assistant you can ask in English or Spanish. The assistant does not make things up: it searches the database, answers only with what NASA documents say, and cites every piece of data, so you can open the original page it comes from. If a question has nothing to do with fire in space, it simply does not answer it.

One of the clearest findings is that almost all the evidence comes from microgravity. For lunar and Martian gravity, and with the oxygen levels planned for those habitats, there are practically no tests, and that is exactly one of the priorities the site helps bring to light.

The project uses Python with FastAPI and SQLite on the backend, and React with Tailwind on the frontend. The assistant runs on Gemma 4 on a team server and uses Claude as a fallback. All data and images come from NASA.
