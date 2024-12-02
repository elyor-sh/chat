import {User} from "./types.js";

export const getCurrentUser = () => {
    const key = 'currentUser';

    if(sessionStorage.getItem(key)) {
        return JSON.parse(sessionStorage.getItem(key))
    }

    const names = ['Алексей', 'Мария', 'Иван', 'Елена', 'Дмитрий', 'Анна', 'Сергей', 'Ольга'];
    const surnames = ['Иванов', 'Петров', 'Смирнов', 'Кузнецов', 'Попов', 'Соколов', 'Лебедев', 'Козлов'];

    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomSurname = surnames[Math.floor(Math.random() * surnames.length)];

    const currentUser = new User(
        Math.random().toString(36).substring(7),
        `${randomName} ${randomSurname}`,
        'client'
    )

    sessionStorage.setItem(key, JSON.stringify(currentUser))

    return currentUser
}