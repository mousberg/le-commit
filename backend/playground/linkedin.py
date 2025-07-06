

# dataclass for profile output
from dataclasses import dataclass

import aiohttp
from bs4 import BeautifulSoup

@dataclass
class Profile:
    name: str
    headline: str
    location: str
    connections: int

default_headers = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    
}


async def gather_profile_information(profile_url) -> Profile:
    async with aiohttp.ClientSession() as session:
        async with session.get(profile_url) as response:
            html = await response.text()
            print(html)
            soup = BeautifulSoup(html, "html.parser")
            name = soup.find("h1", class_="profile-name").text.strip()
            headline = soup.find("h2", class_="headline").text.strip()
            location = soup.find("span", class_="location").text.strip()

            return Profile(name, headline, location, connections)





def main():
    profile_url = "https://www.linkedin.com/in/yann-lecun/"
    profile = gather_profile_information(profile_url)
    print(profile)

if __name__ == "__main__":
    main()
