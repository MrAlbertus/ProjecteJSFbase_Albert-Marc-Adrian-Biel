// Referència a la col·lecció "items" de Firestore
const items = db.collection("items");

/**
 * Afegeix un nou document a la col·lecció.
 * @param {Object} doc - Objecte amb les propietats del nou ítem.
 */
async function addItem(doc) {
  try {
    // Esperem que Firebase afegeixi el document
    await add(items, doc);

    // Recàrrega la llista d'ítems per a mostrar el nou element
    await loadItems();

    // Neteja el formulari
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";

    // Mostra un missatge d'èxit
    showAlert("Element guardat correctament", "alert-success");
  } catch (error) {
    // En cas d'error, mostra un missatge d'error
    showAlert("Error al intentar guardar l'element", "alert-danger");
  }
}

/**
 * Elimina un document per ID.
 * @param {string} id - ID del document a eliminar.
 */
async function deleteItem(id) {
  try {
    // Esperem que Firebase elimini el document
    await deleteById(items, id);

    // Recàrrega la llista per reflectir l'eliminació
    await loadItems();

    // Missatge d'èxit
    showAlert("Element eliminat correctament", "alert-success");
  } catch (error) {
    // Missatge d'error en cas de problema
    showAlert("Error al intentar eliminar l'element", "alert-danger");
  }
}

/**
 * Carrega les dades d'un document per editar.
 * @param {string} id - ID del document que volem editar.
 */
async function editItem(id) {
  try {
    // Emmagatzema temporalment l'ID en un camp ocult del formulari
    document.getElementById("elementId").value = id;

    // Esperem la lectura del document de Firestore
    const doc = await selectById(items, id);
    const data = doc.data();

    // Omple el formulari amb les dades actuals
    document.getElementById("title").value = data.title;
    document.getElementById("content").value = data.content;
  } catch (error) {
    // Si falla la lectura, mostra un error
    showAlert("Error al intentar editar l'element", "alert-danger");
  }
}

/**
 * Recupera tots els documents i els mostra en una taula.
 */
async function loadItems() {
  try {
    // Obtenim l'array de documents des de Firestore
    // const arrayItems = await selectAll(items);
    // const arrayItems = await selectAll(items, 'title');
    // const arrayItems = await selectWhere(items, 'title', '==', 'test');
    const arrayItems = await selectLike(items, 'title', 'test');

    // Capçalera de la taula
    const table = document.getElementById("listItems");
    table.innerHTML = `
      <tr>
        <th>Títol</th>
        <th>Contingut</th>
        <th></th>
      </tr>
    `;

    // Iterem cada document i construïm una fila per a la taula
    arrayItems.forEach((doc) => {
      const { title, content } = doc.data();
      table.innerHTML += `
        <tr>
          <td>${title}</td>
          <td>${content}</td>
          <td>
            <button type="button" class="btn btn-danger float-right" onclick="deleteItem('${doc.id}')">
              Eliminar
            </button>
            <button type="button" class="btn btn-primary mr-2 float-right" onclick="editItem('${doc.id}')">
              Editar
            </button>
          </td>
        </tr>
      `;
    });
  } catch (error) {
    // Error mostrant la taula
    showAlert("Error al mostrar els elements", "alert-danger");
  }
}

/**
 * Actualitza un document existent.
 * @param {string} id - ID del document a actualitzar.
 * @param {Object} doc - Objecte amb les noves dades.
 */
async function updateItem(id, doc) {
  try {
    // Esperem que Firebase actualitzi el document
    await updateById(items, id, doc);

    // Recàrrega la llista per mostrar l'actualització
    await loadItems();

    // Neteja el formulari i l'ID ocult
    document.getElementById("elementId").value = "";
    document.getElementById("title").value = "";
    document.getElementById("content").value = "";

    // Missatge d'èxit
    showAlert("Element actualitzat correctament", "alert-success");
  } catch (error) {
    // Missatge d'error si no es pot actualitzar
    showAlert("Error al intentar actualitzar l'element", "alert-danger");
  }
}