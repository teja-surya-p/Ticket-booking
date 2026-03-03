"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MoviesService = void 0;
const common_1 = require("@nestjs/common");
const constants_1 = require("../common/constants");
const movie_entity_1 = require("../entities/movie.entity");
const firestore_service_1 = require("../config/firestore.service");
const movie_factory_1 = require("../factory/movie.factory");
let MoviesService = class MoviesService {
    constructor(firestoreService) {
        this.firestoreService = firestoreService;
        this.logger = new common_1.Logger(MoviesService.name);
        this.restProjectId = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? '';
        this.restApiKey = process.env.FIREBASE_WEB_API_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? '';
        this.firestoreRestEnabled = !this.firestoreService.isEnabled() && Boolean(this.restProjectId && this.restApiKey);
        this.inMemoryMovies = this.firestoreService.isEnabled() || this.firestoreRestEnabled ? [] : (0, movie_factory_1.createSeedMovies)();
        if (this.firestoreRestEnabled) {
            this.logger.warn('Using Firestore REST mode for movies. Configure FIREBASE_SERVICE_ACCOUNT_PATH for full admin mode.');
        }
    }
    async findAll(query = {}) {
        const search = query.search?.trim().toLowerCase();
        const genre = query.genre?.trim();
        const status = query.status;
        const movies = this.firestoreService.isEnabled()
            ? await this.readAllMoviesFromStore()
            : this.firestoreRestEnabled
                ? await this.readAllMoviesFromFirestoreRest()
                : this.readAllMoviesFromMemory();
        return movies.filter((movie) => {
            const matchesSearch = search
                ? movie.title.toLowerCase().includes(search)
                : true;
            const matchesGenre = genre && genre !== 'all'
                ? this.normalizeGenres(movie).includes(genre)
                : true;
            const matchesStatus = status ? movie.status === status : true;
            return matchesSearch && matchesGenre && matchesStatus;
        });
    }
    async findById(id) {
        if (!this.firestoreService.isEnabled() && !this.firestoreRestEnabled) {
            const movie = this.inMemoryMovies.find((item) => item.id === id);
            if (!movie) {
                throw new common_1.NotFoundException(`Movie with id ${id} not found`);
            }
            return (0, movie_entity_1.toMovieEntity)(movie);
        }
        if (this.firestoreRestEnabled) {
            const movies = await this.readAllMoviesFromFirestoreRest();
            const movie = movies.find((item) => item.id === id);
            if (!movie) {
                throw new common_1.NotFoundException(`Movie with id ${id} not found`);
            }
            return (0, movie_entity_1.toMovieEntity)(movie);
        }
        const docRef = await this.findMovieDocRefById(id);
        if (!docRef) {
            throw new common_1.NotFoundException(`Movie with id ${id} not found`);
        }
        const snapshot = await docRef.get();
        if (!snapshot.exists) {
            throw new common_1.NotFoundException(`Movie with id ${id} not found`);
        }
        return this.normalizeMovie(snapshot.data(), id);
    }
    async getGenres() {
        const movies = this.firestoreService.isEnabled()
            ? await this.readAllMoviesFromStore()
            : this.firestoreRestEnabled
                ? await this.readAllMoviesFromFirestoreRest()
                : this.readAllMoviesFromMemory();
        return Array.from(new Set(movies.flatMap((movie) => this.normalizeGenres(movie)))).sort();
    }
    async create(dto) {
        if (!this.firestoreService.isEnabled() && !this.firestoreRestEnabled) {
            const nextId = Math.max(...this.inMemoryMovies.map((movie) => movie.id), 0) + 1;
            const newMovie = this.normalizeMovie({
                id: nextId,
                ...dto,
            }, nextId);
            this.inMemoryMovies.push((0, movie_entity_1.toMovieEntity)(newMovie));
            return (0, movie_entity_1.toMovieEntity)(newMovie);
        }
        const movies = this.firestoreRestEnabled
            ? await this.readAllMoviesFromFirestoreRest()
            : await this.readAllMoviesFromStore();
        const nextId = Math.max(...movies.map((movie) => movie.id), 0) + 1;
        const newMovie = this.normalizeMovie({
            id: nextId,
            ...dto,
        }, nextId);
        if (this.firestoreRestEnabled) {
            await this.createMovieViaFirestoreRest(String(nextId), newMovie);
            return (0, movie_entity_1.toMovieEntity)(newMovie);
        }
        await this.collection().doc(String(nextId)).set(newMovie);
        return (0, movie_entity_1.toMovieEntity)(newMovie);
    }
    async update(id, dto) {
        if (!this.firestoreService.isEnabled() && !this.firestoreRestEnabled) {
            const index = this.inMemoryMovies.findIndex((movie) => movie.id === id);
            if (index < 0) {
                throw new common_1.NotFoundException(`Movie with id ${id} not found`);
            }
            const updatedMovie = this.normalizeMovie({
                ...this.inMemoryMovies[index],
                ...dto,
                id,
            }, id);
            this.inMemoryMovies[index] = (0, movie_entity_1.toMovieEntity)(updatedMovie);
            return (0, movie_entity_1.toMovieEntity)(updatedMovie);
        }
        if (this.firestoreRestEnabled) {
            const existingMovie = await this.findById(id);
            const restDoc = await this.findMovieDocumentByIdViaFirestoreRest(id);
            if (!restDoc) {
                throw new common_1.NotFoundException(`Movie with id ${id} not found`);
            }
            const updatedMovie = this.normalizeMovie({
                ...existingMovie,
                ...dto,
                id,
            }, id);
            await this.updateMovieViaFirestoreRest(restDoc.name, updatedMovie);
            return (0, movie_entity_1.toMovieEntity)(updatedMovie);
        }
        const existing = await this.findById(id);
        const docRef = await this.findMovieDocRefById(id);
        if (!docRef) {
            throw new common_1.NotFoundException(`Movie with id ${id} not found`);
        }
        const updatedMovie = this.normalizeMovie({
            ...existing,
            ...dto,
            id,
        }, id);
        await docRef.set(updatedMovie);
        return (0, movie_entity_1.toMovieEntity)(updatedMovie);
    }
    async remove(id) {
        if (!this.firestoreService.isEnabled() && !this.firestoreRestEnabled) {
            const index = this.inMemoryMovies.findIndex((movie) => movie.id === id);
            if (index < 0) {
                throw new common_1.NotFoundException(`Movie with id ${id} not found`);
            }
            const movieToDelete = this.inMemoryMovies[index];
            await this.deleteMovieAssetsFromStorage(movieToDelete);
            this.inMemoryMovies.splice(index, 1);
            return;
        }
        if (this.firestoreRestEnabled) {
            const restDoc = await this.findMovieDocumentByIdViaFirestoreRest(id);
            if (!restDoc) {
                throw new common_1.NotFoundException(`Movie with id ${id} not found`);
            }
            const movieToDelete = this.normalizeMovie(this.fromFirestoreFields(restDoc.fields), id);
            await this.deleteMovieAssetsFromStorage(movieToDelete);
            await this.deleteMovieViaFirestoreRest(restDoc.name);
            return;
        }
        const docRef = await this.findMovieDocRefById(id);
        if (!docRef) {
            throw new common_1.NotFoundException(`Movie with id ${id} not found`);
        }
        const snapshot = await docRef.get();
        if (!snapshot.exists) {
            throw new common_1.NotFoundException(`Movie with id ${id} not found`);
        }
        const movieToDelete = this.normalizeMovie(snapshot.data(), id);
        await this.deleteMovieAssetsFromStorage(movieToDelete);
        await docRef.delete();
    }
    async deleteMovieAssetsFromStorage(movie) {
        const urls = [movie?.poster, movie?.trailerUrl, movie?.trailerThumbnail].filter((value) => typeof value === 'string' && value.trim().length > 0);
        const parsedObjects = urls
            .map((url) => this.parseStorageObjectUrl(url))
            .filter((value) => value !== null);
        const uniqueObjects = Array.from(new Map(parsedObjects.map((item) => [`${item.bucket}/${item.objectPath}`, item])).values());
        for (const item of uniqueObjects) {
            await this.deleteStorageObject(item.bucket, item.objectPath);
        }
    }
    parseStorageObjectUrl(url) {
        if (typeof url !== 'string' || url.trim().length === 0) {
            return null;
        }
        const value = url.trim();
        if (value.startsWith('gs://')) {
            const withoutPrefix = value.slice(5);
            const firstSlashIndex = withoutPrefix.indexOf('/');
            if (firstSlashIndex <= 0 || firstSlashIndex === withoutPrefix.length - 1) {
                return null;
            }
            return {
                bucket: withoutPrefix.slice(0, firstSlashIndex),
                objectPath: decodeURIComponent(withoutPrefix.slice(firstSlashIndex + 1)),
            };
        }
        let parsedUrl;
        try {
            parsedUrl = new URL(value);
        }
        catch {
            return null;
        }
        if (parsedUrl.hostname === 'firebasestorage.googleapis.com') {
            const firebaseApiMatch = parsedUrl.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
            if (!firebaseApiMatch) {
                return null;
            }
            return {
                bucket: decodeURIComponent(firebaseApiMatch[1]),
                objectPath: decodeURIComponent(firebaseApiMatch[2]),
            };
        }
        if (parsedUrl.hostname === 'storage.googleapis.com') {
            const cloudApiMatch = parsedUrl.pathname.match(/^\/download\/storage\/v1\/b\/([^/]+)\/o\/(.+)$/);
            if (cloudApiMatch) {
                return {
                    bucket: decodeURIComponent(cloudApiMatch[1]),
                    objectPath: decodeURIComponent(cloudApiMatch[2]),
                };
            }
            const cloudStoragePath = parsedUrl.pathname.replace(/^\/+/, '');
            if (!cloudStoragePath) {
                return null;
            }
            const cloudPathParts = cloudStoragePath.split('/');
            if (cloudPathParts.length < 2) {
                return null;
            }
            return {
                bucket: decodeURIComponent(cloudPathParts[0]),
                objectPath: decodeURIComponent(cloudPathParts.slice(1).join('/')),
            };
        }
        return null;
    }
    async deleteStorageObject(bucket, objectPath) {
        const deleteUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(objectPath)}`;
        const response = await fetch(deleteUrl, {
            method: 'DELETE',
        });
        if (response.status === 404) {
            return;
        }
        if (!response.ok) {
            const responseText = await response.text().catch(() => '');
            throw new common_1.InternalServerErrorException(`Failed to delete storage object '${bucket}/${objectPath}' (${response.status}): ${responseText || response.statusText}`);
        }
    }
    collection() {
        return this.firestoreService.db().collection(constants_1.FIRESTORE_COLLECTIONS.movies);
    }
    readAllMoviesFromMemory() {
        return this.inMemoryMovies
            .map((movie) => (0, movie_entity_1.toMovieEntity)(movie))
            .sort((a, b) => a.id - b.id);
    }
    async readAllMoviesFromStore() {
        const snapshot = await this.collection().get();
        const movies = snapshot.docs.map((doc, index) => this.normalizeMovie(doc.data(), index + 1));
        return movies.sort((a, b) => a.id - b.id);
    }
    async readAllMoviesFromFirestoreRest() {
        const payload = await this.fetchFirestoreRest(this.moviesRestCollectionUrl());
        const documents = Array.isArray(payload?.documents) ? payload.documents : [];
        const movies = documents.map((document, index) => this.normalizeMovie(this.fromFirestoreFields(document.fields), index + 1));
        return movies.sort((a, b) => a.id - b.id);
    }
    async findMovieDocumentByIdViaFirestoreRest(id) {
        const payload = await this.fetchFirestoreRest(this.moviesRestCollectionUrl());
        const documents = Array.isArray(payload?.documents) ? payload.documents : [];
        for (let index = 0; index < documents.length; index += 1) {
            const document = documents[index];
            const normalized = this.normalizeMovie(this.fromFirestoreFields(document.fields), index + 1);
            if (normalized.id === id) {
                return document;
            }
        }
        return null;
    }
    async createMovieViaFirestoreRest(documentId, movie) {
        const url = this.moviesRestCollectionUrl(`documentId=${encodeURIComponent(documentId)}`);
        await this.fetchFirestoreRest(url, {
            method: 'POST',
            body: JSON.stringify({
                fields: this.toFirestoreFields(movie),
            }),
        });
    }
    async updateMovieViaFirestoreRest(documentName, movie) {
        const url = `https://firestore.googleapis.com/v1/${documentName}?key=${encodeURIComponent(this.restApiKey)}`;
        await this.fetchFirestoreRest(url, {
            method: 'PATCH',
            body: JSON.stringify({
                fields: this.toFirestoreFields(movie),
            }),
        });
    }
    async deleteMovieViaFirestoreRest(documentName) {
        const url = `https://firestore.googleapis.com/v1/${documentName}?key=${encodeURIComponent(this.restApiKey)}`;
        await this.fetchFirestoreRest(url, {
            method: 'DELETE',
        });
    }
    moviesRestCollectionUrl(extraQuery = '') {
        const query = extraQuery ? `&${extraQuery}` : '';
        return `https://firestore.googleapis.com/v1/projects/${this.restProjectId}/databases/(default)/documents/${constants_1.FIRESTORE_COLLECTIONS.movies}?key=${encodeURIComponent(this.restApiKey)}${query}`;
    }
    async fetchFirestoreRest(url, options = {}) {
        const response = await fetch(url, {
            method: options.method ?? 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            body: options.body,
        });
        if (!response.ok) {
            const errorText = await response.text();
            throw new common_1.InternalServerErrorException(`Firestore REST request failed (${response.status}): ${errorText || response.statusText}`);
        }
        if (response.status === 204) {
            return null;
        }
        return await response.json();
    }
    fromFirestoreFields(fields) {
        if (!fields || typeof fields !== 'object') {
            return {};
        }
        return Object.entries(fields).reduce((accumulator, [key, value]) => {
            accumulator[key] = this.fromFirestoreValue(value);
            return accumulator;
        }, {});
    }
    fromFirestoreValue(value) {
        if (!value || typeof value !== 'object') {
            return undefined;
        }
        if ('stringValue' in value) {
            return value.stringValue;
        }
        if ('integerValue' in value) {
            return Number(value.integerValue);
        }
        if ('doubleValue' in value) {
            return Number(value.doubleValue);
        }
        if ('booleanValue' in value) {
            return Boolean(value.booleanValue);
        }
        if ('timestampValue' in value) {
            return value.timestampValue;
        }
        if ('nullValue' in value) {
            return null;
        }
        if ('arrayValue' in value) {
            const values = Array.isArray(value.arrayValue?.values) ? value.arrayValue.values : [];
            return values.map((item) => this.fromFirestoreValue(item));
        }
        if ('mapValue' in value) {
            return this.fromFirestoreFields(value.mapValue?.fields);
        }
        return undefined;
    }
    toFirestoreFields(data) {
        if (!data || typeof data !== 'object') {
            return {};
        }
        return Object.entries(data).reduce((accumulator, [key, value]) => {
            if (value !== undefined) {
                accumulator[key] = this.toFirestoreValue(value);
            }
            return accumulator;
        }, {});
    }
    toFirestoreValue(value) {
        if (value === null) {
            return { nullValue: null };
        }
        if (typeof value === 'string') {
            return { stringValue: value };
        }
        if (typeof value === 'number') {
            if (Number.isFinite(value) && Number.isInteger(value)) {
                return { integerValue: String(value) };
            }
            return { doubleValue: value };
        }
        if (typeof value === 'boolean') {
            return { booleanValue: value };
        }
        if (Array.isArray(value)) {
            return {
                arrayValue: {
                    values: value.map((item) => this.toFirestoreValue(item)),
                },
            };
        }
        if (typeof value === 'object') {
            return {
                mapValue: {
                    fields: this.toFirestoreFields(value),
                },
            };
        }
        return { stringValue: String(value) };
    }
    async findMovieDocRefById(id) {
        const querySnapshot = await this.collection().where('id', '==', id).limit(1).get();
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
            ? data.showtimes.filter((item) => typeof item === 'string')
            : [];
        const cast = Array.isArray(data?.cast)
            ? data.cast.filter((item) => typeof item === 'string')
            : [];
        const status = this.normalizeStatus(data?.status);
        const genres = this.normalizeGenres(data);
        const rating = status === 'currently_running'
            ? typeof data?.rating === 'string' && data.rating.trim().length > 0
                ? data.rating.trim()
                : ''
            : '';
        return (0, movie_entity_1.toMovieEntity)({
            id,
            title: typeof data?.title === 'string' && data.title.trim().length > 0
                ? data.title.trim()
                : `Movie ${id}`,
            genre: genres[0] ?? 'Unknown',
            genres,
            rating,
            description: typeof data?.description === 'string' ? data.description : '',
            poster: typeof data?.poster === 'string' && data.poster.trim().length > 0
                ? data.poster
                : constants_1.DEFAULT_MOVIE_POSTER,
            trailerUrl: typeof data?.trailerUrl === 'string' ? data.trailerUrl : constants_1.DEFAULT_TRAILER_URL,
            trailerThumbnail: typeof data?.trailerThumbnail === 'string' && data.trailerThumbnail.trim().length > 0
                ? data.trailerThumbnail
                : undefined,
            status,
            showtimes,
            duration: typeof data?.duration === 'string' && data.duration.trim().length > 0
                ? data.duration.trim()
                : 'TBD',
            director: typeof data?.director === 'string' && data.director.trim().length > 0
                ? data.director.trim()
                : 'Unknown',
            cast,
        });
    }
    normalizeStatus(value) {
        return value === 'currently_running' ? 'currently_running' : 'coming_soon';
    }
    normalizeGenres(data) {
        const rawGenres = Array.isArray(data?.genres)
            ? data.genres
            : typeof data?.genre === 'string'
                ? data.genre.split(',')
                : [];
        const genres = rawGenres
            .filter((value) => typeof value === 'string')
            .map((value) => value.trim())
            .filter(Boolean);
        return Array.from(new Set(genres));
    }
};
exports.MoviesService = MoviesService;
exports.MoviesService = MoviesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [firestore_service_1.FirestoreService])
], MoviesService);
