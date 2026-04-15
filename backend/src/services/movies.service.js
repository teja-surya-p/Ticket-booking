import {
  ConflictException,
  Injectable,
  InternalServerErrorException,
  NotFoundException
} from "@nestjs/common";
import {
  DEFAULT_MOVIE_POSTER,
  DEFAULT_TRAILER_URL,
  FIRESTORE_COLLECTIONS
} from "../common/constants.js";
import { decorateClass } from "../common/nest-metadata.js";
import { FirestoreService } from "../config/firestore.service.js";
import { toMovieEntity } from "../entities/movie.entity.js";

const SEED_MOVIES = [
  {
    id: 1,
    title: "The Last Horizon",
    genre: "Action",
    genres: ["Action", "Sci-Fi"],
    rating: "PG-13",
    description: "A lone astronaut discovers a mysterious signal at the edge of the solar system, setting off an interstellar race against time.",
    poster: DEFAULT_MOVIE_POSTER,
    trailerUrl: DEFAULT_TRAILER_URL,
    status: "currently_running",
    showtimes: [],
    duration: "2h 15m",
    director: "James Holden",
    cast: ["Marcus Bell", "Sofia Reyes", "David Nakamura"],
    showroomId: "showroom-1",
    releaseDate: null
  },
  {
    id: 2,
    title: "Garden of Shadows",
    genre: "Drama",
    genres: ["Drama", "Thriller"],
    rating: "R",
    description: "A forensic botanist uncovers a decades-old secret buried in a sprawling country estate, forcing her to question everything she knows.",
    poster: DEFAULT_MOVIE_POSTER,
    trailerUrl: DEFAULT_TRAILER_URL,
    status: "currently_running",
    showtimes: [],
    duration: "1h 55m",
    director: "Laura Chen",
    cast: ["Anna Voss", "Patrick Dune", "Nadia Kowalski"],
    showroomId: "showroom-2",
    releaseDate: null
  },
  {
    id: 3,
    title: "Neon Riders",
    genre: "Action",
    genres: ["Action", "Adventure"],
    rating: "PG-13",
    description: "In a near-future metropolis, a crew of underground couriers must outrace a corporate hit squad to deliver the one package that could bring down the city.",
    poster: DEFAULT_MOVIE_POSTER,
    trailerUrl: DEFAULT_TRAILER_URL,
    status: "currently_running",
    showtimes: [],
    duration: "2h 5m",
    director: "Carlos Ruiz",
    cast: ["Tyler Cross", "Mei Lin", "Jax Monroe"],
    showroomId: "showroom-3",
    releaseDate: null
  },
  {
    id: 4,
    title: "Whispers in the Dark",
    genre: "Horror",
    genres: ["Horror", "Mystery"],
    rating: "",
    description: "A family moves into their dream home only to discover it holds a horrifying secret that has claimed every previous resident.",
    poster: DEFAULT_MOVIE_POSTER,
    trailerUrl: DEFAULT_TRAILER_URL,
    status: "coming_soon",
    showtimes: [],
    duration: "2h 20m",
    director: "Evelyn Hart",
    cast: ["Olivia Stone", "Henry Walsh", "Camille Dubois"],
    showroomId: null,
    releaseDate: "2025-06-15"
  },
  {
    id: 5,
    title: "Chronicles of the Deep",
    genre: "Adventure",
    genres: ["Adventure", "Fantasy"],
    rating: "",
    description: "A marine archaeologist stumbles upon an ancient underwater civilization, triggering a chain of events that threatens to reshape human history.",
    poster: DEFAULT_MOVIE_POSTER,
    trailerUrl: DEFAULT_TRAILER_URL,
    status: "coming_soon",
    showtimes: [],
    duration: "2h 45m",
    director: "Samuel Park",
    cast: ["Zara Okafor", "Leo Fontaine", "Priya Sharma"],
    showroomId: null,
    releaseDate: "2025-08-01"
  }
];

class MoviesService {
  constructor(firestoreService) {
    this.firestoreService = firestoreService;
  }

  async onModuleInit() {
    await this.seedMoviesIfEmpty();
  }

  async seedMoviesIfEmpty() {
    const snapshot = await this.collection().limit(1).get();
    if (!snapshot.empty) {
      return;
    }

    const now = new Date().toISOString();
    const batch = this.firestoreService.db().batch();

    for (const seed of SEED_MOVIES) {
      const docRef = this.collection().doc(String(seed.id));
      batch.set(docRef, toMovieEntity({ ...seed, createdAt: now, updatedAt: now }));
    }

    await batch.commit();
  }

  async findAll(query = {}) {
    const search = query.search?.trim().toLowerCase();
    const genre = query.genre?.trim();
    const status = query.status;
    const movies = await this.readAllMoviesFromStore();

    return movies.filter((movie) => {
      const matchesSearch = search ? movie.title.toLowerCase().includes(search) : true;
      const matchesGenre =
        genre && genre !== "all" ? this.normalizeGenres(movie).includes(genre) : true;
      const matchesStatus = status ? movie.status === status : true;
      return matchesSearch && matchesGenre && matchesStatus;
    });
  }

  async findById(id) {
    const docRef = await this.findMovieDocRefById(id);
    if (!docRef) {
      throw new NotFoundException(`Movie with id ${id} not found`);
    }

    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new NotFoundException(`Movie with id ${id} not found`);
    }

    return this.normalizeMovie(snapshot.data(), id);
  }

  async getGenres() {
    const movies = await this.readAllMoviesFromStore();

    return Array.from(new Set(movies.flatMap((movie) => this.normalizeGenres(movie)))).sort();
  }

  async create(dto) {
    if (dto.showroomId) {
      const showtimes = Array.isArray(dto.showtimes) ? dto.showtimes : [];
      await this.assertNoShowtimeConflict(dto.showroomId, showtimes, null);
    }

    const movies = await this.readAllMoviesFromStore();
    const nextId = Math.max(...movies.map((movie) => movie.id), 0) + 1;
    const newMovie = this.normalizeMovie(
      {
        id: nextId,
        ...dto
      },
      nextId
    );

    await this.collection().doc(String(nextId)).set(newMovie);
    return toMovieEntity(newMovie);
  }

  async update(id, dto) {
    const existing = await this.findById(id);
    const docRef = await this.findMovieDocRefById(id);

    if (!docRef) {
      throw new NotFoundException(`Movie with id ${id} not found`);
    }

    const showroomToCheck = dto.showroomId ?? existing.showroomId;
    if (showroomToCheck) {
      const showtimes = Array.isArray(dto.showtimes) ? dto.showtimes : (existing.showtimes ?? []);
      await this.assertNoShowtimeConflict(showroomToCheck, showtimes, id);
    }

    const updatedMovie = this.normalizeMovie(
      {
        ...existing,
        ...dto,
        id
      },
      id
    );

    await docRef.set(updatedMovie);
    return toMovieEntity(updatedMovie);
  }

  async remove(id) {
    const docRef = await this.findMovieDocRefById(id);
    if (!docRef) {
      throw new NotFoundException(`Movie with id ${id} not found`);
    }

    const snapshot = await docRef.get();
    if (!snapshot.exists) {
      throw new NotFoundException(`Movie with id ${id} not found`);
    }

    const movieToDelete = this.normalizeMovie(snapshot.data(), id);
    await this.deleteMovieAssetsFromStorage(movieToDelete);
    await docRef.delete();
  }

  async deleteMovieAssetsFromStorage(movie) {
    const urls = [movie?.poster, movie?.trailerUrl, movie?.trailerThumbnail].filter(
      (value) => typeof value === "string" && value.trim().length > 0
    );
    const parsedObjects = urls
      .map((url) => this.parseStorageObjectUrl(url))
      .filter((value) => value !== null);
    const uniqueObjects = Array.from(
      new Map(parsedObjects.map((item) => [`${item.bucket}/${item.objectPath}`, item])).values()
    );

    for (const item of uniqueObjects) {
      await this.deleteStorageObject(item.bucket, item.objectPath);
    }
  }

  parseStorageObjectUrl(url) {
    if (typeof url !== "string" || url.trim().length === 0) {
      return null;
    }

    const value = url.trim();
    if (value.startsWith("gs://")) {
      const withoutPrefix = value.slice(5);
      const firstSlashIndex = withoutPrefix.indexOf("/");

      if (firstSlashIndex <= 0 || firstSlashIndex === withoutPrefix.length - 1) {
        return null;
      }

      return {
        bucket: withoutPrefix.slice(0, firstSlashIndex),
        objectPath: decodeURIComponent(withoutPrefix.slice(firstSlashIndex + 1))
      };
    }

    let parsedUrl;
    try {
      parsedUrl = new URL(value);
    } catch {
      return null;
    }

    if (parsedUrl.hostname === "firebasestorage.googleapis.com") {
      const firebaseApiMatch = parsedUrl.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);

      if (!firebaseApiMatch) {
        return null;
      }

      return {
        bucket: decodeURIComponent(firebaseApiMatch[1]),
        objectPath: decodeURIComponent(firebaseApiMatch[2])
      };
    }

    if (parsedUrl.hostname === "storage.googleapis.com") {
      const cloudApiMatch = parsedUrl.pathname.match(/^\/download\/storage\/v1\/b\/([^/]+)\/o\/(.+)$/);

      if (cloudApiMatch) {
        return {
          bucket: decodeURIComponent(cloudApiMatch[1]),
          objectPath: decodeURIComponent(cloudApiMatch[2])
        };
      }

      const cloudStoragePath = parsedUrl.pathname.replace(/^\/+/, "");
      if (!cloudStoragePath) {
        return null;
      }

      const cloudPathParts = cloudStoragePath.split("/");
      if (cloudPathParts.length < 2) {
        return null;
      }

      return {
        bucket: decodeURIComponent(cloudPathParts[0]),
        objectPath: decodeURIComponent(cloudPathParts.slice(1).join("/"))
      };
    }

    return null;
  }

  async deleteStorageObject(bucket, objectPath) {
    const deleteUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectPath)}`;
    const response = await fetch(deleteUrl, {
      method: "DELETE"
    });

    if (response.status === 404) {
      return;
    }

    if (!response.ok) {
      const responseText = await response.text().catch(() => "");
      throw new InternalServerErrorException(
        `Failed to delete storage object '${bucket}/${objectPath}' (${response.status}): ${
          responseText || response.statusText
        }`
      );
    }
  }

  collection() {
    return this.firestoreService.db().collection(FIRESTORE_COLLECTIONS.movies);
  }

  async readAllMoviesFromStore() {
    const snapshot = await this.collection().get();
    const movies = snapshot.docs.map((doc, index) => this.normalizeMovie(doc.data(), index + 1));
    return movies.sort((a, b) => a.id - b.id);
  }

  async findMovieDocRefById(id) {
    const querySnapshot = await this.collection().where("id", "==", id).limit(1).get();
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].ref;
    }

    const idDocRef = this.collection().doc(String(id));
    const idDoc = await idDocRef.get();
    if (idDoc.exists) {
      return idDocRef;
    }

    const allMoviesSnapshot = await this.collection().get();
    for (let index = 0; index < allMoviesSnapshot.docs.length; index += 1) {
      const doc = allMoviesSnapshot.docs[index];
      const normalized = this.normalizeMovie(doc.data(), index + 1);

      if (normalized.id === id) {
        return doc.ref;
      }
    }

    return null;
  }

  normalizeMovie(data, fallbackId) {
    const rawId = Number(data?.id);
    const id = Number.isFinite(rawId) && rawId > 0 ? rawId : fallbackId;
    const showtimes = Array.isArray(data?.showtimes)
      ? data.showtimes.filter((item) => typeof item === "string")
      : [];
    const cast = Array.isArray(data?.cast)
      ? data.cast.filter((item) => typeof item === "string")
      : [];
    const status = this.normalizeStatus(data?.status);
    const genres = this.normalizeGenres(data);
    const rating =
      status === "currently_running"
        ? typeof data?.rating === "string" && data.rating.trim().length > 0
          ? data.rating.trim()
          : ""
        : "";

    return toMovieEntity({
      id,
      title:
        typeof data?.title === "string" && data.title.trim().length > 0
          ? data.title.trim()
          : `Movie ${id}`,
      genre: genres[0] ?? "Unknown",
      genres,
      rating,
      description: typeof data?.description === "string" ? data.description : "",
      poster:
        typeof data?.poster === "string" && data.poster.trim().length > 0
          ? data.poster
          : DEFAULT_MOVIE_POSTER,
      trailerUrl: typeof data?.trailerUrl === "string" ? data.trailerUrl : DEFAULT_TRAILER_URL,
      trailerThumbnail:
        typeof data?.trailerThumbnail === "string" && data.trailerThumbnail.trim().length > 0
          ? data.trailerThumbnail
          : undefined,
      status,
      showtimes,
      duration:
        typeof data?.duration === "string" && data.duration.trim().length > 0
          ? data.duration.trim()
          : "TBD",
      director:
        typeof data?.director === "string" && data.director.trim().length > 0
          ? data.director.trim()
          : "Unknown",
      cast,
      showroomId:
        typeof data?.showroomId === "string" && data.showroomId.trim().length > 0
          ? data.showroomId.trim()
          : null,
      releaseDate:
        typeof data?.releaseDate === "string" && data.releaseDate.trim().length > 0
          ? data.releaseDate.trim()
          : null
    });
  }

  async findByShowroomId(showroomId) {
    const snapshot = await this.collection()
      .where("showroomId", "==", showroomId)
      .get();
    return snapshot.docs.map((doc, index) => this.normalizeMovie(doc.data(), index + 1));
  }

  async assertNoShowtimeConflict(showroomId, newShowtimes, excludeId) {
    const moviesInRoom = await this.findByShowroomId(showroomId);
    const conflicts = [];

    for (const movie of moviesInRoom) {
      if (excludeId !== null && movie.id === excludeId) continue;
      for (const time of (movie.showtimes ?? [])) {
        if (newShowtimes.includes(time)) {
          conflicts.push(time);
        }
      }
    }

    if (conflicts.length > 0) {
      const unique = [...new Set(conflicts)];
      throw new ConflictException(
        `Showroom "${showroomId}" already has another movie scheduled at: ${unique.join(", ")}`
      );
    }
  }

  normalizeStatus(value) {
    return value === "currently_running" ? "currently_running" : "coming_soon";
  }

  normalizeGenres(data) {
    const rawGenres = Array.isArray(data?.genres)
      ? data.genres
      : typeof data?.genre === "string"
        ? data.genre.split(",")
        : [];
    const genres = rawGenres
      .filter((value) => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    return Array.from(new Set(genres));
  }
}

decorateClass(MoviesService, [Injectable()], [FirestoreService]);

export { MoviesService };
