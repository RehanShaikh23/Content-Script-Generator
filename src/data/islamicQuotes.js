// ── Islamic Quotes Collection ──
// Each quote has: arabic (optional), text, source, category

const ISLAMIC_QUOTES = [
  // ── Sabr (Patience) ──
  { arabic: 'إِنَّ اللَّهَ مَعَ الصَّابِرِينَ', text: 'Indeed, Allah is with those who are patient.', source: 'Quran 2:153', category: 'Sabr' },
  { arabic: 'فَإِنَّ مَعَ الْعُسْرِ يُسْرًا', text: 'For indeed, with hardship comes ease.', source: 'Quran 94:5', category: 'Sabr' },
  { arabic: 'وَاصْبِرْ وَمَا صَبْرُكَ إِلَّا بِاللَّهِ', text: 'And be patient, for your patience is only through Allah.', source: 'Quran 16:127', category: 'Sabr' },
  { text: 'No fatigue, nor disease, nor sorrow, nor sadness, nor hurt, nor distress befalls a Muslim, even if it were the prick he receives from a thorn, but that Allah expiates some of his sins for that.', source: 'Sahih al-Bukhari 5641', category: 'Sabr' },
  { text: 'How wonderful is the affair of the believer, for his affairs are all good. If something good happens to him, he is thankful for it and that is good for him. If something bad happens to him, he bears it with patience and that is good for him.', source: 'Sahih Muslim 2999', category: 'Sabr' },
  { arabic: 'وَبَشِّرِ الصَّابِرِينَ', text: 'And give good tidings to the patient.', source: 'Quran 2:155', category: 'Sabr' },
  { text: 'Patience is a pillar of faith.', source: 'Umar ibn al-Khattab (RA)', category: 'Sabr' },
  { text: 'The strongest among you is the one who controls his anger.', source: 'Sahih al-Bukhari', category: 'Sabr' },

  // ── Tawakkul (Trust in Allah) ──
  { arabic: 'وَمَن يَتَوَكَّلْ عَلَى اللَّهِ فَهُوَ حَسْبُهُ', text: 'And whoever relies upon Allah — then He is sufficient for him.', source: 'Quran 65:3', category: 'Tawakkul' },
  { arabic: 'وَعَلَى اللَّهِ فَلْيَتَوَكَّلِ الْمُؤْمِنُونَ', text: 'And upon Allah let the believers rely.', source: 'Quran 3:122', category: 'Tawakkul' },
  { text: 'Tie your camel first, then put your trust in Allah.', source: 'Jami at-Tirmidhi 2517', category: 'Tawakkul' },
  { text: 'If you all relied on Allah with true reliance, He would provide for you as He provides for the birds — they go out hungry in the morning and return full in the evening.', source: 'Jami at-Tirmidhi 2344', category: 'Tawakkul' },
  { arabic: 'حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ', text: 'Sufficient for us is Allah, and He is the best Disposer of affairs.', source: 'Quran 3:173', category: 'Tawakkul' },
  { text: 'When Allah loves a servant, He tests him.', source: 'Jami at-Tirmidhi', category: 'Tawakkul' },

  // ── Gratitude (Shukr) ──
  { arabic: 'لَئِن شَكَرْتُمْ لَأَزِيدَنَّكُمْ', text: 'If you are grateful, I will surely increase you in favor.', source: 'Quran 14:7', category: 'Gratitude' },
  { text: 'He who does not thank people, does not thank Allah.', source: 'Sunan Abu Dawud 4811', category: 'Gratitude' },
  { text: 'Look at those below you and do not look at those above you, for it is the best way not to belittle the favors of Allah.', source: 'Sahih Muslim 2963', category: 'Gratitude' },
  { arabic: 'فَاذْكُرُونِي أَذْكُرْكُمْ وَاشْكُرُوا لِي وَلَا تَكْفُرُونِ', text: 'So remember Me; I will remember you. And be grateful to Me and do not deny Me.', source: 'Quran 2:152', category: 'Gratitude' },
  { text: 'The first of people to be judged on the Day of Resurrection will be a man who had died as a martyr...', source: 'Sahih Muslim 1905', category: 'Gratitude' },

  // ── Taqwa (God-Consciousness) ──
  { arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا اتَّقُوا اللَّهَ', text: 'O you who believe, fear Allah.', source: 'Quran 59:18', category: 'Taqwa' },
  { arabic: 'إِنَّ أَكْرَمَكُمْ عِندَ اللَّهِ أَتْقَاكُمْ', text: 'Indeed, the most noble of you in the sight of Allah is the most righteous of you.', source: 'Quran 49:13', category: 'Taqwa' },
  { text: 'Fear Allah wherever you are, follow a bad deed with a good deed and it will erase it, and behave well towards people.', source: 'Jami at-Tirmidhi 1987', category: 'Taqwa' },
  { text: 'Taqwa is here — and he pointed to his chest three times.', source: 'Sahih Muslim 2564', category: 'Taqwa' },

  // ── Dua (Supplication) ──
  { arabic: 'ادْعُونِي أَسْتَجِبْ لَكُمْ', text: 'Call upon Me; I will respond to you.', source: 'Quran 40:60', category: 'Dua' },
  { arabic: 'وَإِذَا سَأَلَكَ عِبَادِي عَنِّي فَإِنِّي قَرِيبٌ', text: 'And when My servants ask you concerning Me — indeed I am near.', source: 'Quran 2:186', category: 'Dua' },
  { text: 'Nothing can change the Divine decree except dua.', source: 'Musnad Ahmad 22386', category: 'Dua' },
  { text: 'Dua is the weapon of the believer, the pillar of religion, and the light of the heavens and the earth.', source: 'al-Hakim', category: 'Dua' },
  { text: 'The dua of a fasting person is not rejected.', source: 'Ibn Majah 1753', category: 'Dua' },

  // ── Knowledge (Ilm) ──
  { text: 'Seeking knowledge is an obligation upon every Muslim.', source: 'Ibn Majah 224', category: 'Knowledge' },
  { text: 'Whoever follows a path in pursuit of knowledge, Allah will make easy for him a path to Paradise.', source: 'Sahih Muslim 2699', category: 'Knowledge' },
  { arabic: 'رَبِّ زِدْنِي عِلْمًا', text: 'My Lord, increase me in knowledge.', source: 'Quran 20:114', category: 'Knowledge' },
  { text: 'The ink of the scholar is more sacred than the blood of the martyr.', source: 'Hadith', category: 'Knowledge' },
  { text: 'When a person dies, his deeds end except for three: ongoing charity, beneficial knowledge, or a righteous child who prays for him.', source: 'Sahih Muslim 1631', category: 'Knowledge' },

  // ── Mercy & Compassion ──
  { arabic: 'وَمَا أَرْسَلْنَاكَ إِلَّا رَحْمَةً لِّلْعَالَمِينَ', text: 'And We have not sent you except as a mercy to the worlds.', source: 'Quran 21:107', category: 'Mercy' },
  { text: 'The merciful are shown mercy by the Most Merciful. Be merciful to those on earth and the One in heaven will be merciful to you.', source: 'Sunan Abu Dawud 4941', category: 'Mercy' },
  { text: 'He who is not merciful to others, will not be treated mercifully.', source: 'Sahih al-Bukhari 5997', category: 'Mercy' },
  { arabic: 'وَرَحْمَتِي وَسِعَتْ كُلَّ شَيْءٍ', text: 'My mercy encompasses all things.', source: 'Quran 7:156', category: 'Mercy' },
  { text: 'Allah has divided mercy into one hundred parts. He kept ninety-nine parts with Him and sent down one part to the earth.', source: 'Sahih al-Bukhari 6000', category: 'Mercy' },

  // ── Good Character ──
  { text: 'The best among you are those who have the best character.', source: 'Sahih al-Bukhari 6029', category: 'Character' },
  { text: 'A good word is charity.', source: 'Sahih al-Bukhari 6021', category: 'Character' },
  { text: 'Make things easy and do not make them difficult. Give glad tidings and do not drive people away.', source: 'Sahih al-Bukhari 6125', category: 'Character' },
  { text: 'The most beloved of people to Allah are those who are most beneficial to people.', source: 'al-Mu\'jam al-Awsat 6192', category: 'Character' },
  { text: 'Smiling in the face of your brother is charity.', source: 'Jami at-Tirmidhi 1956', category: 'Character' },
  { text: 'Whoever believes in Allah and the Last Day, let him speak good or remain silent.', source: 'Sahih al-Bukhari 6018', category: 'Character' },
  { text: 'None of you truly believes until he loves for his brother what he loves for himself.', source: 'Sahih al-Bukhari 13', category: 'Character' },

  // ── Dhikr (Remembrance) ──
  { arabic: 'أَلَا بِذِكْرِ اللَّهِ تَطْمَئِنُّ الْقُلُوبُ', text: 'Verily, in the remembrance of Allah do hearts find rest.', source: 'Quran 13:28', category: 'Dhikr' },
  { text: 'The comparison of the one who remembers Allah and the one who does not is like the living and the dead.', source: 'Sahih al-Bukhari 6407', category: 'Dhikr' },
  { text: 'There are two statements that are light on the tongue, heavy on the scales, and beloved to the Most Merciful: SubhanAllahi wa bihamdihi, SubhanAllahil Azeem.', source: 'Sahih al-Bukhari 6406', category: 'Dhikr' },
  { text: 'Shall I not tell you of the best of your deeds, the purest in the sight of your Lord, which raises your rank to the highest, which is better for you than spending gold and silver? It is the remembrance of Allah.', source: 'Jami at-Tirmidhi 3377', category: 'Dhikr' },

  // ── Repentance (Tawbah) ──
  { arabic: 'إِنَّ اللَّهَ يُحِبُّ التَّوَّابِينَ وَيُحِبُّ الْمُتَطَهِّرِينَ', text: 'Indeed, Allah loves those who are constantly repentant and loves those who purify themselves.', source: 'Quran 2:222', category: 'Tawbah' },
  { text: 'All the sons of Adam are sinners, but the best of sinners are those who repent often.', source: 'Jami at-Tirmidhi 2499', category: 'Tawbah' },
  { text: 'Allah is more pleased with the repentance of His servant than a person who finds his lost camel in a waterless desert.', source: 'Sahih Muslim 2747', category: 'Tawbah' },
  { arabic: 'قُلْ يَا عِبَادِيَ الَّذِينَ أَسْرَفُوا عَلَىٰ أَنفُسِهِمْ لَا تَقْنَطُوا مِن رَّحْمَةِ اللَّهِ', text: 'Say: O My servants who have transgressed against themselves, do not despair of the mercy of Allah.', source: 'Quran 39:53', category: 'Tawbah' },

  // ── Akhirah (Hereafter) ──
  { arabic: 'كُلُّ نَفْسٍ ذَائِقَةُ الْمَوْتِ', text: 'Every soul shall taste death.', source: 'Quran 3:185', category: 'Akhirah' },
  { text: 'Be in this world as if you were a stranger or a traveler.', source: 'Sahih al-Bukhari 6416', category: 'Akhirah' },
  { text: 'The wise person is the one who holds himself accountable and works for what comes after death.', source: 'Jami at-Tirmidhi 2459', category: 'Akhirah' },
  { text: 'This world is a prison for the believer and a paradise for the disbeliever.', source: 'Sahih Muslim 2956', category: 'Akhirah' },
  { arabic: 'وَالْآخِرَةُ خَيْرٌ وَأَبْقَىٰ', text: 'While the Hereafter is better and more lasting.', source: 'Quran 87:17', category: 'Akhirah' },

  // ── Salah (Prayer) ──
  { text: 'The first matter that the slave will be brought to account for on the Day of Judgment is the prayer.', source: 'Sunan Abu Dawud 864', category: 'Salah' },
  { text: 'Between a man and disbelief is the abandonment of prayer.', source: 'Sahih Muslim 82', category: 'Salah' },
  { arabic: 'إِنَّ الصَّلَاةَ تَنْهَىٰ عَنِ الْفَحْشَاءِ وَالْمُنكَرِ', text: 'Indeed, prayer prohibits immorality and wrongdoing.', source: 'Quran 29:45', category: 'Salah' },
  { text: 'Pray as if it is your last prayer.', source: 'Musnad Ahmad', category: 'Salah' },

  // ── Unity & Brotherhood ──
  { text: 'The believers, in their mutual kindness, compassion, and sympathy, are just like one body. When one limb suffers, the whole body responds to it with wakefulness and fever.', source: 'Sahih al-Bukhari 6011', category: 'Unity' },
  { text: 'Do not envy one another, do not inflate prices on one another, do not hate one another, do not turn away from one another, and do not undercut one another. Be servants of Allah, as brothers.', source: 'Sahih Muslim 2564', category: 'Unity' },
  { arabic: 'وَاعْتَصِمُوا بِحَبْلِ اللَّهِ جَمِيعًا وَلَا تَفَرَّقُوا', text: 'And hold firmly to the rope of Allah all together and do not become divided.', source: 'Quran 3:103', category: 'Unity' },

  // ── Charity (Sadaqah) ──
  { text: 'Charity does not decrease wealth.', source: 'Sahih Muslim 2588', category: 'Sadaqah' },
  { text: 'Save yourself from the Hellfire even if it is with half a date in charity.', source: 'Sahih al-Bukhari 1417', category: 'Sadaqah' },
  { text: 'The upper hand is better than the lower hand. The upper hand is the one that gives, and the lower hand is the one that takes.', source: 'Sahih al-Bukhari 1429', category: 'Sadaqah' },
  { text: 'Whoever removes a worldly grief from a believer, Allah will remove from him one of the griefs of the Day of Resurrection.', source: 'Sahih Muslim 2699', category: 'Sadaqah' },

  // ── Parents ──
  { arabic: 'وَقَضَىٰ رَبُّكَ أَلَّا تَعْبُدُوا إِلَّا إِيَّاهُ وَبِالْوَالِدَيْنِ إِحْسَانًا', text: 'Your Lord has decreed that you worship none but Him, and that you be kind to parents.', source: 'Quran 17:23', category: 'Parents' },
  { text: 'Paradise lies at the feet of your mother.', source: 'Sunan an-Nasa\'i 3104', category: 'Parents' },
  { text: 'The pleasure of the Lord lies in the pleasure of the parent. The anger of the Lord lies in the anger of the parent.', source: 'Jami at-Tirmidhi 1899', category: 'Parents' },

  // ── Sincerity (Ikhlas) ──
  { text: 'Actions are judged by intentions, and every person will get what they intended.', source: 'Sahih al-Bukhari 1', category: 'Ikhlas' },
  { arabic: 'قُلْ إِنَّ صَلَاتِي وَنُسُكِي وَمَحْيَايَ وَمَمَاتِي لِلَّهِ رَبِّ الْعَالَمِينَ', text: 'Say: Indeed, my prayer, my rites of sacrifice, my living and my dying are for Allah, Lord of the worlds.', source: 'Quran 6:162', category: 'Ikhlas' },
  { text: 'Renew your faith by saying La ilaha illAllah.', source: 'Musnad Ahmad 8695', category: 'Ikhlas' },

  // ── Hope & Motivation ──
  { arabic: 'لَا تَحْزَنْ إِنَّ اللَّهَ مَعَنَا', text: 'Do not grieve; indeed Allah is with us.', source: 'Quran 9:40', category: 'Hope' },
  { arabic: 'وَلَا تَيْأَسُوا مِن رَّوْحِ اللَّهِ', text: 'And do not despair of the mercy of Allah.', source: 'Quran 12:87', category: 'Hope' },
  { text: 'If the entire world gathered together to benefit you, they could not benefit you except with what Allah has written for you.', source: 'Jami at-Tirmidhi 2516', category: 'Hope' },
  { arabic: 'وَعَسَىٰ أَن تَكْرَهُوا شَيْئًا وَهُوَ خَيْرٌ لَّكُمْ', text: 'Perhaps you hate a thing and it is good for you.', source: 'Quran 2:216', category: 'Hope' },
  { text: 'Verily, with every difficulty there is relief.', source: 'Quran 94:6', category: 'Hope' },
  { text: 'Allah does not burden a soul beyond that it can bear.', source: 'Quran 2:286', category: 'Hope' },
  { arabic: 'إِنَّ اللَّهَ لَا يُغَيِّرُ مَا بِقَوْمٍ حَتَّىٰ يُغَيِّرُوا مَا بِأَنفُسِهِمْ', text: 'Indeed, Allah will not change the condition of a people until they change what is in themselves.', source: 'Quran 13:11', category: 'Hope' },

  // ── Forgiveness ──
  { text: 'Forgive others and Allah will forgive you.', source: 'Musnad Ahmad 7062', category: 'Forgiveness' },
  { arabic: 'خُذِ الْعَفْوَ وَأْمُرْ بِالْعُرْفِ وَأَعْرِضْ عَنِ الْجَاهِلِينَ', text: 'Show forgiveness, enjoin what is good, and turn away from the ignorant.', source: 'Quran 7:199', category: 'Forgiveness' },
  { text: 'Be forgiving and do not wish punishment for wrongdoers.', source: 'Hadith', category: 'Forgiveness' },

  // ── Rizq (Provision) ──
  { arabic: 'وَفِي السَّمَاءِ رِزْقُكُمْ وَمَا تُوعَدُونَ', text: 'And in the heaven is your provision and whatever you are promised.', source: 'Quran 51:22', category: 'Rizq' },
  { text: 'If you put your whole trust in Allah, as you ought, He most certainly will satisfy your needs, as He satisfies those of the birds. They come out hungry in the morning, but return full to their nests.', source: 'Jami at-Tirmidhi', category: 'Rizq' },

  // ── Time & Life ──
  { arabic: 'وَالْعَصْرِ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ', text: 'By time, indeed mankind is in loss.', source: 'Quran 103:1-2', category: 'Time' },
  { text: 'Take advantage of five before five: your youth before your old age, your health before your sickness, your wealth before your poverty, your free time before you become busy, and your life before your death.', source: 'al-Hakim 7846', category: 'Time' },

  // ── Justice ──
  { arabic: 'يَا أَيُّهَا الَّذِينَ آمَنُوا كُونُوا قَوَّامِينَ بِالْقِسْطِ', text: 'O you who believe, be persistently standing firm in justice.', source: 'Quran 4:135', category: 'Justice' },
  { text: 'Beware of injustice, for injustice will be darkness on the Day of Resurrection.', source: 'Sahih Muslim 2578', category: 'Justice' },

  // ── Family ──
  { text: 'The best of you are those who are best to their families, and I am the best of you to my family.', source: 'Jami at-Tirmidhi 3895', category: 'Family' },
  { text: 'Whoever is kind, affectionate, and easy-going, Allah makes his matters easy for him.', source: 'Hadith', category: 'Family' },

  // ── Contentment ──
  { text: 'Richness is not having many possessions, but richness is being content with oneself.', source: 'Sahih al-Bukhari 6446', category: 'Contentment' },
  { text: 'Whoever wakes up safely in his home, healthy in his body, having the food for the day, it is as if the world has been gathered for him.', source: 'Jami at-Tirmidhi 2346', category: 'Contentment' },

  // ── Humility ──
  { text: 'No one humbles himself for the sake of Allah but Allah raises him in status.', source: 'Sahih Muslim 2588', category: 'Humility' },
  { text: 'Allah has revealed to me that you must be humble, so that no one oppresses another and no one boasts over another.', source: 'Sahih Muslim 2865', category: 'Humility' },

  // ── Love for Allah ──
  { arabic: 'وَالَّذِينَ آمَنُوا أَشَدُّ حُبًّا لِّلَّهِ', text: 'But those who believe are stronger in love for Allah.', source: 'Quran 2:165', category: 'Love' },
  { text: 'There are three qualities, whoever has them will taste the sweetness of faith: that Allah and His Messenger are more beloved to him than anything else.', source: 'Sahih al-Bukhari 16', category: 'Love' },
];

export default ISLAMIC_QUOTES;
