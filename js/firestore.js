// Instància de Firestore
const db = firebase.firestore();

/**
 * Afegeix un nou document a la col·lecció.
 * @param {firebase.firestore.CollectionReference} collection – Referència a la col·lecció.
 * @param {Object} doc – Dades del document a afegir.
 * @returns {Promise<firebase.firestore.DocumentReference>} Referència al document creat.
 */
async function add(collection, doc) {
  try {
    // Esperem que Firestore afegeixi el document i retornem la referència
    const docRef = await collection.add(doc);
    return docRef;
  } catch (error) {
    throw new Error(`Error al afegir l'element: ${error.message}`);
  }
}

/**
 * Elimina un document d’una col·lecció a partir de la seva ID.
 * @param {firebase.firestore.CollectionReference} collection – Referència a la col·lecció.
 * @param {string} id – ID del document a eliminar.
 * @returns {Promise<void>}
 */
async function deleteById(collection, id) {
  try {
    // Esperem que Firestore elimini el document
    await collection.doc(id).delete();
  } catch (error) {
    // Rearrosseguem l'error
    throw new Error(
      `Error al eliminar l'element amb ID ${id}: ${error.message}`
    );
  }
}

/**
 * Recupera tots els documents d'una col·lecció, opcionalment ordenats per un camp.
 * @param {firebase.firestore.CollectionReference} collection - Referència a la col·lecció.
 * @param {string|null} orderByField - Camp pel qual ordenar; si és null, no s'aplica ordre.
 * @returns {Promise<firebase.firestore.QueryDocumentSnapshot[]>} Array de snapshots de documents.
 */
async function selectAll(collection, orderByField = null) {
  try {
    // Escollim la consulta segons si volem ordenar o no
    let querySnapshot;
    if (orderByField === null) {
      querySnapshot = await collection.get();
    } else {
      querySnapshot = await collection.orderBy(orderByField).get();
    }

    // Convertim el QuerySnapshot en un array de documents
    const docs = [];
    querySnapshot.forEach((doc) => {
      docs.push(doc);
    });
    return docs;
  } catch (error) {
    throw new Error(`Error recuperant tots els elements: ${error.message}`);
  }
}

/**
 * Recupera un únic document per ID.
 * @param {firebase.firestore.CollectionReference} collection – Referència a la col·lecció.
 * @param {string} id – ID del document a recuperar.
 * @returns {Promise<firebase.firestore.DocumentSnapshot>} Snapshot del document.
 */
async function selectById(collection, id) {
  try {
    // Esperem la lectura del document
    const docSnap = await collection.doc(id).get();
    return docSnap;
  } catch (error) {
    throw new Error(
      `Error al recuperar l'element amb ID ${id}: ${error.message}`
    );
  }
}

/**
 * Recupera documents d'una col·lecció que compleixin una condició WHERE.
 * @param {firebase.firestore.CollectionReference} collection - Referència a la col·lecció.
 * @param {string} field - Camp pel qual filtrar.
 * @param {firebase.firestore.WhereFilterOp} operator - Operador de la condició ("==", "<", ">=", etc.).
 * @param {*} value - Valor amb què comparar.
 * @returns {Promise<firebase.firestore.QueryDocumentSnapshot[]>} Array de snapshots de documents.
 */
async function selectWhere(collection, field, operator, value) {
  try {
    // Construïm i executem la consulta WHERE
    const querySnapshot = await collection.where(field, operator, value).get();

    // Convertim el QuerySnapshot en un array de documents
    const docs = [];
    querySnapshot.forEach((doc) => {
      docs.push(doc);
    });
    return docs;
  } catch (error) {
    throw new Error(
      `Error recuperant elements on ${field} ${operator} ${value}: ${error.message}`
    );
  }
}

/**
 * Recupera documents on el valor d'un camp comença per una cadena específica (simulant LIKE).
 * IMPORTANT: només retorna documents que comencen per `value`.
 * @param {firebase.firestore.CollectionReference} collection - Referència a la col·lecció.
 * @param {string} field - Camp pel qual fer l'ordre i el filtrat.
 * @param {string} value - Prefix pel qual filtrar els valors.
 * @returns {Promise<firebase.firestore.QueryDocumentSnapshot[]>} Array de snapshots de documents.
 */
async function selectLike(collection, field, value) {
  try {
    // Consulta amb orderBy, startAt i endAt per obtenir efecte "LIKE prefix"
    const querySnapshot = await collection.orderBy(field).startAt(value).endAt(value + "\uf8ff").get();

    // Convertim el QuerySnapshot en un array de documents
    const docs = [];
    querySnapshot.forEach((doc) => {
      docs.push(doc);
    });
    return docs;
  } catch (error) {
    throw new Error(
      `Error recuperant elements similars a ${value}: ${error.message}`
    );
  }
}

/**
 * Actualitza un document existent per ID.
 * @param {firebase.firestore.CollectionReference} collection – Referència a la col·lecció.
 * @param {string} id – ID del document a actualitzar.
 * @param {Object} doc – Dades noves per actualitzar el document.
 * @returns {Promise<void>}
 */
async function updateById(collection, id, doc) {
  try {
    // Esperem que Firestore actualitzi el document
    await collection.doc(id).update(doc);
  } catch (error) {
    throw new Error(
      `Error al actualitzar l'element amb ID ${id}: ${error.message}`
    );
  }
}
