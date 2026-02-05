import pathlib
import urllib.request

SOURCE_URL = "https://raw.githubusercontent.com/dwyl/english-words/master/words_alpha.txt"
OUTPUT_PATH = pathlib.Path(__file__).resolve().parents[1] / "sql" / "seed_words.sql"


def main() -> None:
	response = urllib.request.urlopen(SOURCE_URL)
	words = response.read().decode().splitlines()
	unique = sorted({word.strip().lower() for word in words if len(word.strip()) == 5 and word.isalpha()})

	lines = ["BEGIN TRANSACTION;"]
	for word in unique:
		lines.append(f"INSERT OR IGNORE INTO words(word) VALUES ('{word}');")
	lines.append("COMMIT;")

	OUTPUT_PATH.write_text("\n".join(lines))
	print(f"Wrote {len(unique)} words to {OUTPUT_PATH}")


if __name__ == "__main__":
	main()
