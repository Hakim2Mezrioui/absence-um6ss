<?php

namespace App\Http\Controllers;

use App\Models\Post;
use App\Services\PostService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PostController extends Controller
{
    protected $postService;

    public function __construct(PostService $postService)
    {
        $this->postService = $postService;
    }

    /**
     * Afficher la liste des postes avec pagination et filtres.
     */
    public function index(Request $request)
    {
        $size = $request->query('size', 10);
        $page = $request->query('page', 1);
        $searchValue = $request->query("searchValue", "");

        $skip = ($page - 1) * $size;

        $query = Post::query();

        // Appliquer le filtre de recherche si nécessaire
        if (!empty($searchValue) && $searchValue !== "") {
            $query->where("name", "LIKE", "%{$searchValue}%");
        }

        // Obtenir le total des résultats avant la pagination
        $total = $query->count();

        // Appliquer la pagination
        $posts = $query->limit($size)->skip($skip)->orderBy("name")->get();

        // Calcul du nombre total de pages
        $totalPages = ($size > 0) ? ceil($total / $size) : 1;

        // Retourner la réponse JSON
        return response()->json([
            "posts" => $posts,
            "totalPages" => $totalPages,
            "total" => $total,
            "status" => 200
        ]);
    }

    /**
     * Afficher un poste spécifique.
     */
    public function show($id)
    {
        $post = $this->postService->getPostById((int) $id);
        
        if (!$post) {
            return response()->json(['message' => 'Poste non trouvé'], 404);
        }
        
        return response()->json($post);
    }

    /**
     * Ajouter un nouveau poste.
     */
    public function store(Request $request)
    {
        $validatedData = $request->validate([
            'name' => 'required|string|max:255|unique:posts,name',
        ]);

        $post = $this->postService->createPost($validatedData);

        return response()->json([
            'message' => 'Poste ajouté avec succès', 
            'post' => $post
        ], 201);
    }

    /**
     * Mettre à jour un poste existant.
     */
    public function update(Request $request, $id)
    {
        $validatedData = $request->validate([
            'name' => [
                'required',
                'string',
                'max:255',
                Rule::unique('posts', 'name')->ignore($id),
            ],
        ]);

        $post = $this->postService->updatePost((int) $id, $validatedData);

        if (!$post) {
            return response()->json(['message' => 'Poste non trouvé'], 404);
        }

        return response()->json([
            'message' => 'Poste mis à jour avec succès', 
            'post' => $post
        ]);
    }

    /**
     * Supprimer un poste.
     */
    public function destroy($id)
    {
        $deleted = $this->postService->deletePost((int) $id);

        if (!$deleted) {
            return response()->json(['message' => 'Poste non trouvé'], 404);
        }

        return response()->json(['message' => 'Poste supprimé avec succès']);
    }

    /**
     * Obtenir tous les postes (sans pagination).
     */
    public function getAll()
    {
        $posts = $this->postService->getAllPosts();
        
        return response()->json([
            'posts' => $posts,
            'status' => 200
        ]);
    }

    /**
     * Rechercher des postes par nom.
     */
    public function search(Request $request)
    {
        $searchValue = $request->query("search", "");
        
        if (empty($searchValue)) {
            return response()->json(['message' => 'Terme de recherche requis'], 400);
        }

        $posts = $this->postService->searchPosts($searchValue);
        
        return response()->json([
            'posts' => $posts,
            'status' => 200
        ]);
    }
} 